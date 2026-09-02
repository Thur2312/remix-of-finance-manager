import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const DISMISSED_KEY = 'sellerfinance:pwa-announcement-seen';

export function PwaInstallAnnouncement() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [isInstalled]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) toast.success('App instalado com sucesso!');
    dismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center">Novidade: app para celular!</DialogTitle>
          <DialogDescription className="text-center">
            Agora você pode instalar o Seller Finance no seu celular ou computador e abrir como um
            aplicativo, direto da tela inicial — sem precisar do navegador.
          </DialogDescription>
        </DialogHeader>

        {!canInstall && (
          <p className="text-sm text-muted-foreground text-center">
            No <strong>Chrome/Android</strong>, toque no menu <strong>⋮</strong> e escolha{' '}
            <strong>"Instalar app"</strong>. No <strong>Safari/iPhone</strong>, toque em{' '}
            <strong>Compartilhar</strong> e depois em <strong>"Adicionar à Tela de Início"</strong>.
          </p>
        )}

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={dismiss}>
            Agora não
          </Button>
          {canInstall && (
            <Button
              onClick={handleInstall}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Instalar aplicativo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
