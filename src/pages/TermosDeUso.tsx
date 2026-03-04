import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermosDeUso() {
    const navigate = useNavigate();

  return (
    <div title="Termos de Uso" className='mt-10'>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Termos de Uso
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
              Estes Termos regulam o uso da plataforma disponível em https://sellerfinance.com.br
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 text-sm leading-6">

            <section className="space-y-4">
              <p>
                Ao utilizar nossos serviços, você concorda integralmente com estes Termos.
              </p>
            </section>

            <Separator />

            {/* 1 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">1. Sobre a Plataforma</h2>
              <p>
                A SellerFinance é uma plataforma digital que oferece ferramentas de
                gestão e análise financeira para vendedores e empreendedores que
                atuam em marketplaces e canais digitais.
              </p>
              <p className="text-muted-foreground">
                A plataforma não configura consultoria financeira, contábil ou jurídica.
              </p>
            </section>

            <Separator />

            {/* 2 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">2. Cadastro e Conta</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Podem se cadastrar pessoas físicas (PF) e jurídicas (PJ).</li>
                <li>O usuário é responsável pelas informações fornecidas.</li>
                <li>A conta é pessoal e intransferível.</li>
                <li>A SellerFinance pode suspender contas que violem estes termos.</li>
              </ul>
            </section>

            <Separator />

            {/* 3 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">3. Planos, Assinaturas e Free Trial</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Plano mensal com cobrança recorrente.</li>
                <li>Plano anual com cobrança antecipada.</li>
                <li>Free Trial de 7 (sete) dias.</li>
              </ul>
              <p>
                Caso o cancelamento não seja realizado antes do término do período de teste,
                a cobrança será realizada automaticamente conforme o plano escolhido.
              </p>
            </section>

            <Separator />

            {/* 4 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">4. Política de Reembolso</h2>
              <p>
                O usuário poderá solicitar reembolso no prazo de até 7 dias corridos
                após a primeira cobrança, conforme o Código de Defesa do Consumidor.
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>A solicitação deve ser feita pelo canal oficial de suporte.</li>
                <li>Após 7 dias da cobrança, não haverá reembolso.</li>
                <li>Para plano anual, aplica-se o mesmo prazo.</li>
              </ul>
            </section>

            <Separator />

            {/* 5 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">5. Cancelamento</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>O cancelamento pode ser feito a qualquer momento pelo painel.</li>
                <li>O acesso permanece ativo até o fim do período pago.</li>
                <li>Não haverá novas cobranças após o cancelamento.</li>
              </ul>
            </section>

            <Separator />

            {/* 6 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">6. Uso Adequado</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Proibido utilizar a plataforma para fins ilícitos.</li>
                <li>Proibido tentar acessar áreas restritas do sistema.</li>
                <li>Proibido compartilhar credenciais com terceiros.</li>
              </ul>
            </section>

            <Separator />

            {/* 7 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">7. Limitação de Responsabilidade</h2>
              <p>
                A SellerFinance fornece ferramentas de apoio à gestão.
                Não garantimos resultados financeiros específicos.
              </p>
              <p>
                Decisões tomadas com base nos dados da plataforma
                são de responsabilidade exclusiva do usuário.
              </p>
            </section>

            <Separator />

            {/* 8 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">8. Integrações com Terceiros</h2>
              <p>
                A plataforma pode integrar-se a serviços externos.
                Não nos responsabilizamos por falhas ou instabilidades desses serviços.
              </p>
            </section>

            <Separator />

            {/* 9 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">9. Dados e Privacidade</h2>
              <p>
                O tratamento de dados pessoais segue a Lei nº 13.709/2018 (LGPD).
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Prestação do serviço</li>
                <li>Processamento de pagamentos</li>
                <li>Melhoria da experiência</li>
                <li>Comunicação relacionada à conta</li>
              </ul>
            </section>

            <Separator />

            {/* 10 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">10. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo da plataforma é de propriedade exclusiva da SellerFinance,
                sendo proibida sua reprodução sem autorização.
              </p>
            </section>

            <Separator />

            {/* 11 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">11. Modificações dos Termos</h2>
              <p>
                Estes Termos podem ser atualizados a qualquer momento.
                O uso contínuo implica concordância com a versão vigente.
              </p>
            </section>

            <Separator />

            {/* 12 */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">12. Foro</h2>
              <p>
                Fica eleito o foro da comarca de João Pessoa, Paraíba, Brasil,
                para dirimir quaisquer controvérsias decorrentes destes Termos.
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}