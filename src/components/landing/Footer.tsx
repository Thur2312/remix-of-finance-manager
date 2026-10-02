import { useState } from "react";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import logo from "@/assets/logo-new.svg";
import { SEODialog } from "./SEODialog";

const navLinks = [
  { label: "Para você", href: "#para-voce" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Planos", href: "#planos" },
];

export function Footer() {
  const [seoOpen, setSeoOpen] = useState(false);

  return (
    <footer className="pt-16 pb-8 border-t border-landing-ink/10 text-landing-ink">
      <div className="container">
        <div className="grid md:grid-cols-3 gap-10 pb-10 border-b border-landing-ink/10">
          <div>
            <div className="flex items-center gap-1 mb-4">
              <img src={logo} alt="Seller Finance" className="h-12 w-auto" />
            </div>
            <p className="text-landing-ink-muted text-sm leading-relaxed max-w-xs">
              Gestão financeira completa para vendedores de Shopee, Mercado Livre e TikTok Shop.
            </p>
          </div>

          <div>
            <p className="text-landing-ink font-semibold mb-4">Navegação</p>
            <div className="space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block text-landing-ink-muted hover:text-landing-ink text-sm transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={() => setSeoOpen(true)}
                className="block text-landing-ink-muted hover:text-landing-ink text-sm transition-colors text-left"
              >
                SEO
              </button>
            </div>
          </div>

          <div>
            <p className="text-landing-ink font-semibold mb-4">Contato</p>
            <div className="space-y-3">
              <a
                href="mailto:suporte@sellerfinance.com.br"
                className="flex items-center gap-2 text-landing-ink-muted hover:text-landing-ink text-sm transition-colors"
              >
                <Mail className="w-4 h-4" />
                suporte@sellerfinance.com.br
              </a>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/qx_assessoria/"
                className="w-9 h-9 rounded-full bg-landing-ink/[0.06] flex items-center justify-center text-landing-ink-muted hover:text-landing-ink hover:bg-landing-ink/[0.1] transition-all"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/5583987999393"
                className="w-9 h-9 rounded-full bg-landing-ink/[0.06] flex items-center justify-center text-landing-ink-muted hover:text-landing-ink hover:bg-landing-ink/[0.1] transition-all"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-landing-ink-muted/70 text-sm">© {new Date().getFullYear()} Seller Finance. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="/termos-de-uso" className="text-landing-ink-muted/70 hover:text-landing-ink text-xs transition-colors">
              Termos de uso
            </a>
            <a href="/politica-de-privacidade" className="text-landing-ink-muted/70 hover:text-landing-ink text-xs transition-colors">
              Política de privacidade
            </a>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-landing-ink/25 text-sm font-medium tracking-widest uppercase">Clareza. Controle. Crescimento.</p>
        </div>
      </div>

      <SEODialog open={seoOpen} onOpenChange={setSeoOpen} />
    </footer>
  );
}
