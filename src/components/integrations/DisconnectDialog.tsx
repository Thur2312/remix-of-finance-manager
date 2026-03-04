import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Unplug } from 'lucide-react';

interface DisconnectDialogProps {
  providerName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DisconnectDialog({ providerName, onConfirm, isLoading }: DisconnectDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Unplug className="mr-2 h-4 w-4" /> Desconectar integração
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar {providerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Ao desconectar, paramos de sincronizar pedidos e dados do {providerName}. Seus dados históricos permanecem salvos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Desconectando...' : 'Confirmar desconexão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
