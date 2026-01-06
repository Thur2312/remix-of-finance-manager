import * as XLSX from 'xlsx';

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  counterpart: string | null;
  balance: number | null;
  fitid: string | null; // ID único para detecção de duplicatas
}

export interface ParseResult {
  transactions: BankTransaction[];
  bankName: string | null;
  accountNumber: string | null;
  startDate: string | null;
  endDate: string | null;
}

// Gerar ID único para transação
const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Detectar tipo baseado no valor
const detectType = (amount: number): 'income' | 'expense' => {
  return amount >= 0 ? 'income' : 'expense';
};

// Extrair contraparte da descrição
const extractCounterpart = (description: string): string | null => {
  // Padrões comuns em extratos brasileiros
  const patterns = [
    /PIX\s+(?:RECEBIDO|ENVIADO)\s*[-:]\s*(.+?)(?:\s*CPF|\s*CNPJ|$)/i,
    /TED\s*[-:]\s*(.+?)(?:\s*AG|\s*CC|$)/i,
    /DOC\s*[-:]\s*(.+?)(?:\s*AG|\s*CC|$)/i,
    /TRANSF\s*[-:]\s*(.+?)(?:\s*AG|\s*CC|$)/i,
    /PAG(?:TO|AMENTO)?\s*[-:]\s*(.+?)(?:\s*-|$)/i,
    /COMPRA\s+(?:CARTAO\s+)?(.+?)(?:\s*-|$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 100);
    }
  }

  return null;
};

// Parse OFX file
export const parseOFXFile = async (file: File): Promise<ParseResult> => {
  const text = await file.text();
  const transactions: BankTransaction[] = [];

  // Parse OFX usando regex (OFX é um formato baseado em SGML)
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(text)) !== null) {
    const block = match[1];

    const getValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
      const m = block.match(regex);
      return m ? m[1].trim() : '';
    };

    const dtposted = getValue('DTPOSTED');
    const trnamt = parseFloat(getValue('TRNAMT').replace(',', '.')) || 0;
    const fitid = getValue('FITID');
    const name = getValue('NAME');
    const memo = getValue('MEMO');

    const description = [name, memo].filter(Boolean).join(' - ');
    const dateStr = dtposted.length >= 8
      ? `${dtposted.slice(0, 4)}-${dtposted.slice(4, 6)}-${dtposted.slice(6, 8)}`
      : new Date().toISOString().split('T')[0];

    transactions.push({
      id: generateTransactionId(),
      date: dateStr,
      description: description || 'Transação sem descrição',
      amount: Math.abs(trnamt),
      type: detectType(trnamt),
      counterpart: extractCounterpart(description),
      balance: null,
      fitid: fitid || null,
    });
  }

  // Extrair informações da conta
  const bankIdMatch = text.match(/<BANKID>([^<\n]+)/i);
  const acctIdMatch = text.match(/<ACCTID>([^<\n]+)/i);

  return {
    transactions,
    bankName: bankIdMatch ? bankIdMatch[1].trim() : null,
    accountNumber: acctIdMatch ? acctIdMatch[1].trim() : null,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : null,
    endDate: transactions.length > 0 ? transactions[0].date : null,
  };
};

// Parse CSV file
export const parseCSVFile = async (file: File, bankType: string = 'generic'): Promise<ParseResult> => {
  const text = await file.text();
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const transactions: BankTransaction[] = [];

  if (lines.length < 2) {
    return { transactions: [], bankName: null, accountNumber: null, startDate: null, endDate: null };
  }

  // Detectar separador
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.replace(/"/g, '').trim().toLowerCase());

  // Mapear colunas baseado no tipo de banco
  const columnMaps: Record<string, { date: string[], description: string[], amount: string[], balance: string[] }> = {
    nubank: {
      date: ['data', 'date'],
      description: ['titulo', 'descrição', 'description', 'title'],
      amount: ['valor', 'amount', 'value'],
      balance: ['saldo', 'balance'],
    },
    inter: {
      date: ['data lançamento', 'data', 'date'],
      description: ['descrição', 'historico', 'description'],
      amount: ['valor', 'amount'],
      balance: ['saldo', 'balance'],
    },
    generic: {
      date: ['data', 'date', 'data lançamento', 'data lancamento', 'dt'],
      description: ['descrição', 'descricao', 'description', 'historico', 'histórico', 'memo', 'titulo'],
      amount: ['valor', 'amount', 'value', 'quantia'],
      balance: ['saldo', 'balance', 'saldo final'],
    },
  };

  const map = columnMaps[bankType] || columnMaps.generic;

  // Encontrar índices das colunas
  const findColumnIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = findColumnIndex(map.date);
  const descIdx = findColumnIndex(map.description);
  const amountIdx = findColumnIndex(map.amount);
  const balanceIdx = findColumnIndex(map.balance);

  if (dateIdx === -1 || amountIdx === -1) {
    console.warn('Colunas obrigatórias não encontradas:', { dateIdx, amountIdx });
    return { transactions: [], bankName: null, accountNumber: null, startDate: null, endDate: null };
  }

  // Processar linhas
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.replace(/"/g, '').trim());

    if (values.length < Math.max(dateIdx, amountIdx) + 1) continue;

    const dateRaw = values[dateIdx];
    const description = descIdx !== -1 ? values[descIdx] : 'Transação';
    const amountRaw = values[amountIdx];
    const balanceRaw = balanceIdx !== -1 ? values[balanceIdx] : null;

    // Parse data (formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
    let dateStr = '';
    if (dateRaw.includes('/')) {
      const parts = dateRaw.split('/');
      if (parts.length === 3) {
        dateStr = parts[2].length === 4
          ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          : `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else if (dateRaw.includes('-')) {
      const parts = dateRaw.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        dateStr = dateRaw;
      } else if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    if (!dateStr) continue;

    // Parse valor
    const amount = parseFloat(
      amountRaw
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    );

    if (isNaN(amount)) continue;

    const balance = balanceRaw
      ? parseFloat(balanceRaw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'))
      : null;

    transactions.push({
      id: generateTransactionId(),
      date: dateStr,
      description: description || 'Transação',
      amount: Math.abs(amount),
      type: detectType(amount),
      counterpart: extractCounterpart(description),
      balance: !isNaN(balance!) ? balance : null,
      fitid: null,
    });
  }

  return {
    transactions,
    bankName: bankType !== 'generic' ? bankType : null,
    accountNumber: null,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : null,
    endDate: transactions.length > 0 ? transactions[0].date : null,
  };
};

// Parse XLSX file
export const parseXLSXFile = async (file: File, bankType: string = 'generic'): Promise<ParseResult> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Pegar primeira aba
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Converter para JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (data.length < 2) {
    return { transactions: [], bankName: null, accountNumber: null, startDate: null, endDate: null };
  }

  const headers = data[0].map(h => (h || '').toString().toLowerCase().trim());
  const transactions: BankTransaction[] = [];

  // Mesma lógica de mapeamento do CSV
  const columnMaps: Record<string, { date: string[], description: string[], amount: string[], balance: string[] }> = {
    inter: {
      date: ['data lançamento', 'data', 'date'],
      description: ['descrição', 'historico', 'description'],
      amount: ['valor', 'amount'],
      balance: ['saldo', 'balance'],
    },
    generic: {
      date: ['data', 'date', 'data lançamento', 'data lancamento', 'dt'],
      description: ['descrição', 'descricao', 'description', 'historico', 'histórico', 'memo', 'titulo'],
      amount: ['valor', 'amount', 'value', 'quantia'],
      balance: ['saldo', 'balance', 'saldo final'],
    },
  };

  const map = columnMaps[bankType] || columnMaps.generic;

  const findColumnIndex = (possibleNames: string[]): number => {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const dateIdx = findColumnIndex(map.date);
  const descIdx = findColumnIndex(map.description);
  const amountIdx = findColumnIndex(map.amount);
  const balanceIdx = findColumnIndex(map.balance);

  if (dateIdx === -1 || amountIdx === -1) {
    console.warn('Colunas obrigatórias não encontradas:', { dateIdx, amountIdx });
    return { transactions: [], bankName: null, accountNumber: null, startDate: null, endDate: null };
  }

  // Processar linhas
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < Math.max(dateIdx, amountIdx) + 1) continue;

    const dateRaw = row[dateIdx];
    const description = descIdx !== -1 ? (row[descIdx] || '').toString() : 'Transação';
    const amountRaw = row[amountIdx];
    const balanceRaw = balanceIdx !== -1 ? row[balanceIdx] : null;

    // Parse data
    let dateStr = '';
    if (typeof dateRaw === 'number') {
      // Excel date serial number
      const excelDate = XLSX.SSF.parse_date_code(dateRaw);
      dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else if (typeof dateRaw === 'string') {
      if (dateRaw.includes('/')) {
        const parts = dateRaw.split('/');
        if (parts.length === 3) {
          dateStr = parts[2].length === 4
            ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
            : `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else if (dateRaw.includes('-')) {
        dateStr = dateRaw;
      }
    }

    if (!dateStr) continue;

    // Parse valor
    let amount: number;
    if (typeof amountRaw === 'number') {
      amount = amountRaw;
    } else {
      amount = parseFloat(
        (amountRaw || '0')
          .toString()
          .replace(/[R$\s]/g, '')
          .replace(/\./g, '')
          .replace(',', '.')
      );
    }

    if (isNaN(amount)) continue;

    let balance: number | null = null;
    if (balanceRaw !== null) {
      if (typeof balanceRaw === 'number') {
        balance = balanceRaw;
      } else {
        balance = parseFloat(
          (balanceRaw || '0')
            .toString()
            .replace(/[R$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
        );
        if (isNaN(balance)) balance = null;
      }
    }

    transactions.push({
      id: generateTransactionId(),
      date: dateStr,
      description: description || 'Transação',
      amount: Math.abs(amount),
      type: detectType(amount),
      counterpart: extractCounterpart(description),
      balance,
      fitid: null,
    });
  }

  return {
    transactions,
    bankName: bankType !== 'generic' ? bankType : null,
    accountNumber: null,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : null,
    endDate: transactions.length > 0 ? transactions[0].date : null,
  };
};

// Detectar formato do arquivo
export const detectFileFormat = (file: File): 'ofx' | 'csv' | 'xlsx' | 'pdf' | 'unknown' => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.ofx') || name.endsWith('.ofc')) return 'ofx';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  if (name.endsWith('.pdf')) return 'pdf';
  return 'unknown';
};

// Bancos suportados
export const SUPPORTED_BANKS = [
  { id: 'generic', name: 'Genérico (Detectar automaticamente)' },
  { id: 'nubank', name: 'Nubank' },
  { id: 'inter', name: 'Banco Inter' },
  { id: 'bradesco', name: 'Bradesco' },
  { id: 'itau', name: 'Itaú' },
  { id: 'santander', name: 'Santander' },
  { id: 'caixa', name: 'Caixa Econômica' },
  { id: 'bb', name: 'Banco do Brasil' },
  { id: 'sicoob', name: 'Sicoob' },
  { id: 'sicredi', name: 'Sicredi' },
];
