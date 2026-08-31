import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { findView, isMarketplace } from './marketplaceViews';
import { MarketplaceControl } from './MarketplaceControl';
import { ViewTabs } from './ViewTabs';

// Casca única de Gestão: o seletor de marketplace e as abas de view ficam
// sempre montados; só o painel de conteúdo troca. Antes cada célula
// (marketplace × view) era uma rota/página isolada e o seletor de
// marketplace só existia no dashboard.
export default function GestaoShell() {
  const { marketplace, view } = useParams<{ marketplace: string; view: string }>();

  if (!isMarketplace(marketplace)) {
    return <Navigate to="/gestao/shopee/dashboard" replace />;
  }

  const currentView = findView(marketplace, view);
  if (!currentView) {
    // view ausente ou não suportada por este marketplace → dashboard
    return <Navigate to={`/gestao/${marketplace}/dashboard`} replace />;
  }

  const { Component } = currentView;

  return (
    <PageShell className="space-y-6">
      <MarketplaceControl current={marketplace} view={currentView.key} />
      <ViewTabs marketplace={marketplace} current={currentView.key} />
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Component key={`${marketplace}/${currentView.key}`} />
      </Suspense>
    </PageShell>
  );
}
