import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermosDeUso() {
    const navigate = useNavigate();

  return (
    <div title="Política de Privacidade" className='mt-10'>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground">
            Última atualização: 02 de março de 2026
          </p>
        </div>

        <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-50 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

        {/* Card Principal */}
        <Card>
          <CardHeader>
            <CardTitle>SellerFinance</CardTitle>
            <CardDescription>
              Esta política descreve como coletamos, utilizamos e protegemos seus dados.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 text-sm leading-6">

            <section className="space-y-4">
              <p>
                Esta Política de Privacidade descreve como a SellerFinance coleta,
                utiliza, armazena e compartilha informações quando você utiliza
                nossa plataforma, incluindo integrações com o TikTok Shop Open Platform
                e o TikTok for Developers.
              </p>

              <p>
                Ao utilizar nossos serviços, você concorda com as práticas descritas nesta política.
              </p>
            </section>

            <Separator />

            {/* Seção 1 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">1. Informações que Coletamos</h2>

              <div className="space-y-3">
                <h3 className="font-medium">1.1 Informações de Autenticação</h3>
                <p>
                  Quando você autoriza nossa aplicação junto às plataformas TikTok,
                  recebemos tokens de acesso (access_token e refresh_token) que permitem
                  a integração com as APIs. Não armazenamos suas credenciais de login.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">1.2 Dados da Loja (TikTok Shop)</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Dados Financeiros:</strong> vendas, repasses, taxas e extratos.</li>
                  <li><strong>Dados de Pedidos:</strong> pedidos, devoluções e reembolsos.</li>
                  <li><strong>Dados do Vendedor:</strong> identificadores como shop_id e informações da loja.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">1.3 Dados de Uso</h3>
                <p>
                  Coletamos informações sobre funcionalidades acessadas e preferências
                  para melhoria contínua do serviço.
                </p>
              </div>
            </section>

            <Separator />

            {/* Seção 2 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">2. Como Utilizamos as Informações</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Manter o funcionamento da plataforma.</li>
                <li>Sincronizar dados financeiros e operacionais.</li>
                <li>Melhorar funcionalidades e experiência.</li>
                <li>Enviar comunicações importantes.</li>
                <li>Cumprir obrigações legais.</li>
              </ul>
            </section>

            <Separator />

            {/* Seção 3 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">3. Compartilhamento de Informações</h2>
              <p>Não vendemos dados pessoais.</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Provedores de Serviço:</strong> hospedagem e suporte.</li>
                <li><strong>Obrigação Legal:</strong> quando exigido por lei.</li>
                <li><strong>Transferência Empresarial:</strong> em caso de fusão ou aquisição.</li>
              </ul>
            </section>

            <Separator />

            {/* Seção 4 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">4. Retenção de Dados</h2>
              <p>
                Mantemos os dados apenas pelo tempo necessário para cumprir as
                finalidades descritas e obrigações legais.
              </p>
            </section>

            <Separator />

            {/* Seção 5 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">5. Segurança da Informação</h2>
              <p>
                Implementamos medidas técnicas e organizacionais adequadas para proteger
                seus dados contra acesso não autorizado.
              </p>
              <p className="text-muted-foreground">
                Contudo, nenhum sistema é 100% seguro.
              </p>
            </section>

            <Separator />

            {/* Seção 6 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">6. Seus Direitos (LGPD)</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Solicitar confirmação e acesso aos seus dados.</li>
                <li>Solicitar correção ou exclusão.</li>
                <li>Solicitar portabilidade.</li>
                <li>Revogar consentimento.</li>
              </ul>
              <p>
                Para exercer seus direitos, entre em contato pelo e-mail abaixo.
              </p>
            </section>

            <Separator />

            {/* Contato */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">8. Contato</h2>
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p><strong>Email:</strong> suporte@financemanager.com.br</p>
                <p><strong>Website:</strong> https://sellerfinance.com.br</p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}