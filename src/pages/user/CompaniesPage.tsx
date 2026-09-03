import { useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, AlertTriangle,
  TrendingDown, Percent, Store, RefreshCw
} from 'lucide-react';
import { useCompanies, Company, type CompanyFormData } from '../../hooks/useCompanies';
import { applyTax } from '../../lib/tax';
import { CompanyModal } from '../../components/settings/CompanyModal';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCompanyConnections } from '@/hooks/useCompanyConnections';

const UNASSIGNED = '__none__';

// ─── Lojas × Empresa (Bloco D) ──────────────────────────────────────────────
function StoresSection() {
  const { connections, companies, assignCompany, isLoading } = useCompanyConnections();
  if (isLoading || connections.length === 0) return null;
  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="text-sm font-semibold">Lojas conectadas</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cada conta de marketplace conectada é uma loja. Diga a que empresa (CNPJ) ela pertence —
          é isso que separa receita e custo entre as empresas.
        </p>
        <div className="mt-3 space-y-2">
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conn.label}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {conn.marketplace}{conn.status !== 'connected' ? ` · ${conn.status}` : ''}
                </p>
              </div>
              <Select
                value={conn.companyId ?? UNASSIGNED}
                onValueChange={v => assignCompany.mutate({
                  connectionId: conn.id,
                  companyId: v === UNASSIGNED ? null : v,
                })}
              >
                <SelectTrigger className="h-8 w-[190px] text-xs">
                  <SelectValue placeholder="Sem empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Sem empresa</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        {connections.some(c => !c.companyId && c.status === 'connected') && (
          <p className="mt-3 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
            Loja sem empresa fica no consolidado — não entra no resultado de nenhuma empresa nem no rateio de custo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────
function ConfirmDialog({
  open, title, description, onConfirm, onCancel, loading
}: {
  open: boolean; title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 max-w-sm w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2">
            {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tax Preview Card ────────────────────────────────────────────────────────
function TaxPreviewCard({ taxRate, taxBase }: { taxRate: number; taxBase: Company['tax_base'] }) {
  const example = 10000;
  const { taxAmount, netAfterTax } = applyTax({ revenue: example, profit: example, taxRate, taxBase });
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-1.5">
        <Percent className="w-3.5 h-3.5" />
        Simulação com alíquota de {taxRate}% sobre {taxBase === 'revenue' ? 'faturamento' : 'lucro'}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">{taxBase === 'revenue' ? 'Faturamento' : 'Lucro líquido'}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            R$ {example.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Imposto deduzido
          </span>
          <span className="font-medium text-red-500">
            − R$ {taxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="pt-1.5 border-t border-indigo-200 dark:border-indigo-800 flex justify-between text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Lucro após imposto</span>
          <span className="font-bold text-indigo-700 dark:text-indigo-400">
            R$ {netAfterTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Company Card ────────────────────────────────────────────────────────────
function CompanyCard({
  company,
  onEdit,
  onDelete,
}: {
  company: Company;
  onEdit: (c: Company) => void;
  onDelete: (c: Company) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {company.name}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
              {company.cnpj}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(company)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(company)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <TaxPreviewCard taxRate={company.tax_rate} taxBase={company.tax_base} />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Store className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Nenhuma empresa cadastrada
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-5">
        Cadastre sua empresa para vincular às integrações e aplicar a alíquota de imposto nos relatórios.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Cadastrar Primeira Empresa
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const { companies, loading, error, refetch, createCompany, updateCompany, deleteCompany } = useCompanies();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleNew = () => { setEditingCompany(null); setModalOpen(true); };
  const handleEdit = (c: Company) => { setEditingCompany(c); setModalOpen(true); };

  const handleSave = async (data: CompanyFormData) => {
    if (editingCompany) {
      await updateCompany(editingCompany.id, data);
    } else {
      await createCompany(data);
    }
  };

  const handleDelete = async () => {
    if (!deletingCompany) return;
    setDeleting(true);
    try {
      await deleteCompany(deletingCompany.id);
      setDeletingCompany(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell
      icon={Building2}
      title="Empresas"
      subtitle="Seus CNPJs, a alíquota de imposto de cada um, e a que empresa cada loja pertence."
      action={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={refetch} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova empresa
          </Button>
        </div>
      }
      className="space-y-6"
    >
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
        <Percent className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          A alíquota de cada empresa é usada pra calcular o imposto deduzido do lucro nos dashboards e na DRE.
          Os custos fixos e a Precificação usam a separação por empresa/loja.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-3 text-sm text-destructive">{error}</p>
          <button onClick={refetch} className="text-sm text-primary hover:underline">Tentar novamente</button>
        </div>
      ) : companies.length === 0 ? (
        <EmptyState onNew={handleNew} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {companies.map(company => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={handleEdit}
              onDelete={setDeletingCompany}
            />
          ))}
        </div>
      )}

      <StoresSection />

      {/* Modals */}
      <CompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingCompany}
      />

      <ConfirmDialog
        open={!!deletingCompany}
        title={`Excluir "${deletingCompany?.name}"?`}
        description="Esta ação removerá a empresa e desvinculará todas as integrações associadas. Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeletingCompany(null)}
        loading={deleting}
      />
    </PageShell>
  );
}