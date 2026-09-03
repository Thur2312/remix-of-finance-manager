import { useState } from 'react';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompanyModal } from '@/components/settings/CompanyModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useSelectedCompany } from '@/hooks/useSelectedCompany';
import { cn } from '@/lib/utils';

// Seletor de empresa GLOBAL do topbar (Bloco D, Fase 2). Lê/escreve o mesmo
// store (company-scope-store) que a DRE, os dashboards, Precificação e Custos
// Fixos consomem — trocar aqui reflete em toda a área interna.
//
// Fica escondido para quem tem 0 ou 1 empresa: sem escolha a fazer, e o usuário
// de 1 CNPJ já tem essa empresa como selecionada automaticamente.
export function CompanySwitcher() {
  const { companyId, setCompanyId, company, companies, loading } = useSelectedCompany();
  const { createCompany, refetch } = useCompanies();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading || companies.length <= 1) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 max-w-[180px] gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <Building2 className="size-4 shrink-0" />
            <span className="truncate font-medium">
              {company ? company.name : 'Todas as empresas'}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem
            onClick={() => setCompanyId(null)}
            className="flex items-center justify-between gap-2"
          >
            <span>Todas as empresas</span>
            <Check className={cn('size-4', companyId !== null && 'opacity-0')} />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {companies.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => setCompanyId(c.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">
                {c.name}
                <span className="ml-1.5 text-xs text-muted-foreground">{c.tax_rate}%</span>
              </span>
              <Check className={cn('size-4 shrink-0', companyId !== c.id && 'opacity-0')} />
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="size-3.5" />
            Nova empresa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createCompany}
        onSuccess={(created) => {
          refetch();
          setCompanyId(created.id);
          setModalOpen(false);
        }}
      />
    </>
  );
}
