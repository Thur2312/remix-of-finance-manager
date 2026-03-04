import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingBag, Store, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';

interface ConnectDialogProps {
  provider: 'shopee' | 'tiktok';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onManualAuth?: (data: { shopId: string; accessToken: string; refreshToken: string }) => void;
  isLoading?: boolean;
  isManualLoading?: boolean;
}

const syncItems = [
  'Pedidos e status',
  'Itens dos pedidos (SKU, nome, quantidade)',
  'Pagamentos e repasses',
  'Taxas e comissões',
  'Cancelamentos e devoluções',
];

const providerInfo = {
  shopee: { name: 'Shopee', icon: ShoppingBag, color: 'text-orange-500' },
  tiktok: { name: 'TikTok Shop', icon: Store, color: 'text-foreground' },
};

export function ConnectDialog({ provider, open, onOpenChange, onConfirm, onManualAuth, isLoading, isManualLoading }: ConnectDialogProps) {
  const [step, setStep] = useState(1);
  const [shopId, setShopId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const info = providerInfo[provider];
  const Icon = info.icon;

  const handleClose = () => {
    setStep(1);
    setShopId('');
    setAccessToken('');
    setRefreshToken('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className={`h-6 w-6 ${info.color}`} strokeWidth={2} />
            </div>
            <DialogTitle>Conectar {info.name}</DialogTitle>
          </div>
          {step === 1 && (
            <DialogDescription>
              Ao conectar, sincronizaremos automaticamente os seguintes dados:
            </DialogDescription>
          )}
          {step === 3 && (
            <DialogDescription>
              Cole os tokens obtidos pelo API Test Tool da {info.name}.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 1 && (
          <>
            <div className="space-y-3 py-2">
              {syncItems.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Checkbox checked disabled className="data-[state=checked]:bg-primary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && (
          <>
            <div className="py-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Você será redirecionado para o {info.name} para autorizar o acesso à sua loja.
                Após autorizar, retornará automaticamente.
              </p>
              <p className="text-xs text-muted-foreground">
                Seus tokens serão armazenados de forma segura e criptografada no servidor.
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={onConfirm} disabled={isLoading}>
                  {isLoading ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
                  ) : (
                    `Continuar e autorizar no ${info.name}`
                  )}
                </Button>
              </div>
              {provider === 'shopee' && onManualAuth && (
                <button
                  onClick={() => setStep(3)}
                  className="text-xs text-muted-foreground hover:text-primary underline mt-1"
                >
                  <KeyRound className="inline h-3 w-3 mr-1" />
                  Já tenho os tokens (via API Test Tool)
                </button>
              )}
            </DialogFooter>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="manual-shop-id">Shop ID</Label>
                <Input
                  id="manual-shop-id"
                  placeholder="Ex: 226719331"
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-access-token">Access Token</Label>
                <Input
                  id="manual-access-token"
                  placeholder="Cole o access_token aqui"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-refresh-token">Refresh Token (opcional)</Label>
                <Input
                  id="manual-refresh-token"
                  placeholder="Cole o refresh_token aqui"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                No API Test Tool da Shopee, clique em <strong>"Get Access Token"</strong> para obter os tokens. Cole o <code>access_token</code> e o <code>shop_id</code> acima.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button
                onClick={() => onManualAuth?.({ shopId, accessToken, refreshToken })}
                disabled={isManualLoading || !accessToken.trim() || !shopId.trim()}
              >
                {isManualLoading ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Conectando...</>
                ) : (
                  'Conectar com tokens'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
