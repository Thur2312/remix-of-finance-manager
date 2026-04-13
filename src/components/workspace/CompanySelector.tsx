import { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Building2, Plus, Settings, Check, Loader2 } from 'lucide-react';
import { CreateCompanyDialog } from './CreateCompanyDialog';
import { cn } from '@/lib/utils';

interface CompanySelectorProps {
  variant?: 'select' | 'dropdown';
  className?: string;
  showSettings?: boolean;
}

export function CompanySelector({ 
  variant = 'dropdown', 
  className,
  showSettings = false 
}: CompanySelectorProps) {
  const { 
    currentCompany, 
    companies, 
    loading,
    setCurrentCompanyById,
    isInitialized 
  } = useCompany();
  const { user } = useAuth();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleCompanyChange = async (companyId: string) => {
    if (companyId === currentCompany?.id) return;
    
    setIsSwitching(true);
    try {
      await setCurrentCompanyById(companyId);
      // Force page reload to refresh all data
      window.location.reload();
    } finally {
      setIsSwitching(false);
    }
  };

  // Don't show until initialized
  if (!isInitialized || loading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-9 w-48 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  // No companies yet
  if (companies.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          className={cn("gap-2", className)}
        >
          <Plus className="h-4 w-4" />
          Criar Empresa
        </Button>
        <CreateCompanyDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </>
    );
  }

  // Single company - show minimal info
  if (companies.length === 1 && variant === 'dropdown') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[200px]">
            {currentCompany?.name || 'Empresa'}
          </span>
        </div>
      </div>
    );
  }

  // Multiple companies - show selector
  if (variant === 'select') {
    return (
      <Select
        value={currentCompany?.id || ''}
        onValueChange={handleCompanyChange}
        disabled={isSwitching}
      >
        <SelectTrigger className={cn("w-[200px]", className)}>
          <SelectValue placeholder="Selecionar empresa">
            {isSwitching ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Trocando...</span>
              </div>
            ) : (
              currentCompany?.name || 'Selecionar empresa'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem 
              key={company.id} 
              value={company.id}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{company.name}</span>
                {company.id === currentCompany?.id && (
                  <Check className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
            </SelectItem>
          ))}
          <SelectItem 
            value="__create_new__"
            className="cursor-pointer text-primary"
            onSelect={() => setIsCreateDialogOpen(true)}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Criar nova empresa</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Dropdown variant
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2 min-w-[180px] justify-between", className)}
            disabled={isSwitching}
          >
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Trocando...</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">
                    {currentCompany?.name || 'Selecionar empresa'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Empresas ({companies.length})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => handleCompanyChange(company.id)}
              className={cn(
                "cursor-pointer",
                company.id === currentCompany?.id && "bg-accent"
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <Building2 className="h-4 w-4" />
                <span className="truncate flex-1">{company.name}</span>
                {company.id === currentCompany?.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Criar nova empresa</span>
            </div>
          </DropdownMenuItem>
          {showSettings && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.href = '/perfil'}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCompanyDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
}
