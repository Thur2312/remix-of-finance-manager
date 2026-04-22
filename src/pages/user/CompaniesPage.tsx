import { useState } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Link2, AlertTriangle,
  TrendingDown, Percent, Store, RefreshCw
} from 'lucide-react';
import { useCompanies, applyTaxRate, Company } from '../../hooks/useCompanies';
import { CompanyModal } from '../../components/settings/CompanyModal';

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
function TaxPreviewCard({ taxRate }: { taxRate: number }) {
  const example = 10000;
  const { taxAmount, netAfterTax } = applyTaxRate(example, taxRate);
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-1.5">
        <Percent className="w-3.5 h-3.5" />
        Simulação com alíquota de {taxRate}%
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Lucro líquido</span>
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

      <TaxPreviewCard taxRate={company.tax_rate} />

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <Link2 className="w-3.5 h-3.5" />
        <span>Vincule integrações TikTok/Shopee a esta empresa</span>
      </div>
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

  const handleSave = async (data) => {
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Empresas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie seus CNPJs e alíquotas de imposto vinculadas às integrações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refetch}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Empresa
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-start gap-3">
        <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          A alíquota cadastrada aqui será usada para calcular o <strong>imposto deduzido do lucro líquido</strong> nos dashboards da Shopee e TikTok Shop, exibindo tanto o valor do imposto separado quanto o lucro já descontado.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={refetch} className="text-sm text-indigo-600 hover:underline">Tentar novamente</button>
        </div>
      ) : companies.length === 0 ? (
        <EmptyState onNew={handleNew} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
}