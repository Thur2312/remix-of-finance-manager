import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-new.svg";
import { AuthMotif } from "./AuthMotif";

interface AuthHighlight {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface AuthShellProps {
  title: string;
  description: string;
  highlights?: AuthHighlight[];
  backTo?: string;
  children: ReactNode;
}

export function AuthShell({ title, description, highlights, backTo = "/", children }: AuthShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-white">
      <button
        onClick={() => navigate(backTo)}
        className="fixed top-5 left-5 z-50 flex items-center gap-2 text-gray-500 hover:text-gray-900 lg:text-white/70 lg:hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Voltar</span>
      </button>

      {/* Branding pane */}
      <div className="hidden lg:flex lg:w-[44%] section-dark relative items-center justify-center p-14 overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 30% 20%, rgba(49,142,241,0.35) 0%, transparent 70%)",
          }}
        />
        <AuthMotif />
        <div className="relative max-w-sm">
          <img src={logo} alt="Seller Finance" className="h-10 w-auto mb-10" />

          <h1 className="font-display text-3xl font-bold text-white leading-tight mb-4">{title}</h1>
          <p className="text-white/60 text-base leading-relaxed">{description}</p>

          {highlights && (
            <div className="space-y-6 pt-10 mt-10 border-t border-white/10">
              {highlights.map(({ icon: Icon, title: hTitle, desc }) => (
                <div key={hTitle} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-[#318EF1]/15 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[#318EF1]" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold">{hTitle}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form pane */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center mb-8 mt-6">
            <img src={logo} alt="Seller Finance" className="h-9 w-auto" />
          </div>
          <div className="glass-card rounded-3xl p-8 sm:p-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
