import { Building2, ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCompanies, Company } from '@/hooks/useCompanies';
import { useState } from 'react';
import { CompanyModal } from '@/components/settings/CompanyModal';

interface CompanySelectorProps {
  selectedCompany: Company | null;
  onSelect: (company: Company | null) => void;
}

export function CompanySelector({ selectedCompany, onSelect }: CompanySelectorProps) {
  const { companies, loading, refetch, createCompany } = useCompanies();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">Empresa:</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" disabled={loading}>
              {selectedCompany ? (
                <>
                  <span className="font-medium">{selectedCompany.name}</span>
                  <span className="text-muted-foreground text-xs">· {selectedCompany.tax_rate}%</span>
                </>
              ) : (
                <span className="text-muted-foreground">Selecionar empresa</span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60">
            {!loading && companies.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                Nenhuma empresa cadastrada
              </div>
            )}

            {companies.map((company) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => onSelect(company)}
                className="flex justify-between"
              >
                <span>{company.name}</span>
                <span className="text-xs text-muted-foreground">{company.tax_rate}%</span>
              </DropdownMenuItem>
            ))}

            {companies.length > 0 && selectedCompany && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onSelect(null)}
                  className="text-muted-foreground gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Remover empresa
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setModalOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova empresa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal usa a assinatura unificada: onClose + onSave + onSuccess */}
      <CompanyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={createCompany}
        onSuccess={(company) => {
          refetch();
          onSelect(company);
          setModalOpen(false);
        }}
      />
    </>
  );
}