import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const seoSections = [
  {
    title: "Gestão financeira para vendedores de Shopee, TikTok Shop e Mercado Livre",
    text: "O Seller Finance é a plataforma de gestão financeira criada para quem vende na Shopee, no TikTok Shop e no Mercado Livre e quer saber, com precisão, o lucro real de cada pedido. Diferente das planilhas manuais, o sistema calcula automaticamente taxas de marketplace, custo do produto e demais despesas, entregando uma visão clara da lucratividade da sua loja.",
  },
  {
    title: "Calculadora de precificação para marketplace",
    text: "Defina o preço ideal de venda antes de anunciar. A calculadora de precificação do Seller Finance considera custo do produto, comissões da Shopee, TikTok Shop e Mercado Livre e a margem de lucro desejada, evitando que o vendedor precifique no prejuízo.",
  },
  {
    title: "DRE automático e controle financeiro de loja online",
    text: "Tenha o Demonstrativo de Resultado do Exercício (DRE) da sua operação gerado automaticamente, sem depender de contador ou planilhas. Acompanhe receitas, custos e margem de contribuição por produto, e entenda a evolução financeira da sua loja ao longo do tempo.",
  },
  {
    title: "Cálculo de lucro real por pedido",
    text: "Saiba exatamente quanto sobra de cada venda depois de descontar taxas, frete, impostos e custo do produto. Essa clareza financeira é o que diferencia vendedores que crescem de forma estratégica nos marketplaces.",
  },
  {
    title: "Simulador de cenários de venda por marketplace",
    text: "Compare o mesmo produto e preço na Shopee, no TikTok Shop e no Mercado Livre antes de anunciar. O simulador de cenários do Seller Finance mostra qual canal entrega a melhor margem de lucro para cada produto do seu catálogo.",
  },
  {
    title: "Assistente de anúncio com inteligência artificial",
    text: "Gere títulos e descrições de anúncio otimizados para Shopee, TikTok Shop e Mercado Livre em segundos. O assistente de anúncio com IA do Seller Finance ajuda o vendedor a criar listagens mais atrativas e converter mais vendas.",
  },
  {
    title: "Fluxo de caixa e histórico financeiro para e-commerce",
    text: "Controle entradas e saídas do seu fluxo de caixa, acompanhe o histórico financeiro completo da loja e analise a margem por produto ao longo do tempo, tudo sincronizado automaticamente com seus marketplaces.",
  },
  {
    title: "Integração automática com Shopee, TikTok Shop e Mercado Livre",
    text: "Conecte suas contas de vendedor e sincronize pedidos, produtos, pagamentos e taxas automaticamente. A integração do Seller Finance com Shopee, TikTok Shop e Mercado Livre elimina o trabalho manual de conciliar planilhas.",
  },
];

export function SEODialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seller Finance: gestão financeira completa para vendedores de marketplace</DialogTitle>
          <DialogDescription>
            Cálculo de lucro, precificação inteligente, simulador de cenários, assistente de anúncio com IA e DRE
            automático para quem vende na Shopee, no TikTok Shop e no Mercado Livre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 text-sm leading-6">
          {seoSections.map((section, i) => (
            <div key={section.title}>
              {i > 0 && <Separator className="mb-6" />}
              <h3 className="text-base font-semibold text-[#0A1628] mb-2">{section.title}</h3>
              <p className="text-gray-600">{section.text}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
