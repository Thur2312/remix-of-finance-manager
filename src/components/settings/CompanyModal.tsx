import { useState, useEffect } from 'react';
import { X, Building2, FileText, Percent, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Company, CompanyFormData, formatCNPJ, validateCNPJ } from '../../hooks/useCompanies';

interface CompanyModalProps {
  open: boolean;
  /** Fechar o modal (substitui onOpenChange) */
  onClose: () => void;
  /** Salvar empresa. Se retornar a Company criada/atualizada, o seletor pode usá-la. */
  onSave: (data: CompanyFormData) => Promise<Company | void>;
  initialData?: Company | null;
  /** Callback opcional chamado após salvar com sucesso — útil no CompanySelector */
  onSuccess?: (company: Company) => void;
}

export function CompanyModal({
  open,
  onClose,
  onSave,
  initialData,
  onSuccess,
}: CompanyModalProps) {
  const [form, setForm] = useState<CompanyFormData>({ name: '', cnpj: '', tax_rate: 0, tax_base: 'revenue' });
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyFormData, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ name: initialData.name, cnpj: initialData.cnpj, tax_rate: initialData.tax_rate, tax_base: initialData.tax_base });
    } else {
      setForm({ name: '', cnpj: '', tax_rate: 0, tax_base: 'revenue' });
    }
    setErrors({});
    setFormError(null);
    setSaved(false);
  }, [initialData, open]);

  if (!open) return null;

  const handleClose = () => {
    // Fechar (backdrop/X/Cancelar) enquanto salva descartava a submissão em
    // andamento sem avisar nada.
    if (saving) return;
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CompanyFormData, string>> = {};
    if (!form.name.trim()) newErrors.name = 'Nome da empresa é obrigatório';
    if (!form.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCNPJ(form.cnpj)) {
      newErrors.cnpj = 'CNPJ inválido';
    }
    if (form.tax_rate < 0 || form.tax_rate > 100) {
      newErrors.tax_rate = 'Alíquota deve ser entre 0 e 100';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      const result = await onSave(form);
      setSaved(true);
      if (result && onSuccess) onSuccess(result as Company);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 900);
    } catch (e: unknown) {
      // Antes isso era sempre atribuído ao campo "Nome", mesmo quando o
      // problema real era CNPJ duplicado ou falha de rede.
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {initialData ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {initialData ? 'Atualize os dados da empresa' : 'Cadastre uma nova empresa'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={saving}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {formError && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
            </p>
          )}

          {/* Nome */}
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nome da Empresa
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="company-name"
                type="text"
                placeholder="Ex: Minha Loja LTDA"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.name}
              </p>
            )}
          </div>

          {/* CNPJ */}
          <div>
            <label htmlFor="company-cnpj" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              CNPJ
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="company-cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={e => setForm(p => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.cnpj ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
            </div>
            {errors.cnpj && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.cnpj}
              </p>
            )}
          </div>

          {/* Alíquota */}
          <div>
            <label htmlFor="company-tax-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Alíquota de Imposto
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="company-tax-rate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="Ex: 6.00"
                value={form.tax_rate === 0 ? '' : form.tax_rate}
                onChange={e => setForm(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  errors.tax_rate ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 dark:border-gray-700'
                }`}
              />
            </div>
            {errors.tax_rate && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.tax_rate}
              </p>
            )}
            {form.tax_rate > 0 && (
              <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 rounded-lg">
                {form.tax_base === 'revenue'
                  ? `Para cada R$ 1.000 de faturamento, serão deduzidos R$ ${(form.tax_rate * 10).toFixed(2)} em impostos`
                  : `Para cada R$ 1.000 de lucro, serão deduzidos R$ ${(form.tax_rate * 10).toFixed(2)} em impostos`}
              </p>
            )}
          </div>

          {/* Base de cálculo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Base de cálculo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'revenue' as const, titulo: 'Faturamento', sub: 'Simples Nacional' },
                { value: 'profit' as const, titulo: 'Lucro', sub: 'Presumido / Real' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, tax_base: opt.value }))}
                  className={`px-3 py-2 rounded-xl border text-left transition-all ${
                    form.tax_base === opt.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 ring-1 ring-indigo-500'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{opt.titulo}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{opt.sub}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              O imposto incide sobre o faturamento (Simples) ou sobre o lucro (Presumido/Real). Nunca sobre resultado negativo.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || saved}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 rounded-xl transition-colors flex items-center gap-2 min-w-[100px] justify-center"
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
            ) : saving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
            ) : (
              initialData ? 'Salvar Alterações' : 'Cadastrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}