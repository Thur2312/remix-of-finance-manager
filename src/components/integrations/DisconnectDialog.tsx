import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Unplug } from 'lucide-react';

interface DisconnectDialogProps {
  providerName: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function DisconnectDialog({ providerName, onConfirm, isLoading }: DisconnectDialogProps) {
  // AlertDialogAction do Radix fecha o diálogo sozinho ao clicar (é
  // DialogPrimitive.Close por baixo) — sem preventDefault + controle manual
  // do open, o texto "Desconectando..." nunca chegava a aparecer, porque a
  // confirmação disparava a desconexão em fire-and-forget e já navegava pra
  // outra tela antes dela terminar.
  const [open, setOpen] = useState(false);

  const handleConfirm = async (e: Event) => {
    e.preventDefault();
    await onConfirm();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Desconectando...' : 'Confirmar desconexão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
