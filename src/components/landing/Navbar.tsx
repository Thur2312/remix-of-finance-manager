import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import logo from "@/assets/logo-new.svg";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { RollButton } from "./RollButton";
import { scrollToSection } from "./hooks";

const navLinks = [
  { label: "Para você", href: "#para-voce" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Planos", href: "#planos" },
];

export function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 p-2 sm:p-3">
        <nav
          className={`max-w-[1200px] mx-auto flex items-center justify-between rounded-full pl-5 pr-2 py-2 transition-all duration-300 glass-panel ${
            scrolled ? "shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]" : ""
          }`}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection("#");
            }}
            className="flex items-center gap-1 shrink-0"
          >
            <img src={logo} alt="Seller Finance" className="h-10 sm:h-11 w-auto" />
          </a>

          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className="group relative text-white/70 hover:text-white text-sm font-medium transition-colors py-1"
              >
                {link.label}
                <span className="absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-[#318EF1] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => (user ? navigate("/fluxo-caixa") : navigate("/user/auth"))}
              className="group relative flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium pl-4 pr-3.5 py-2 rounded-full hover:bg-white/[0.06] transition-colors duration-300"
            >
              <span>{user ? "Dashboard" : "Login"}</span>
              <ArrowRight className="w-3.5 h-3.5 -ml-1.5 scale-0 opacity-0 group-hover:ml-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </button>
            <RollButton
              label="Assine já"
              icon={<ArrowRight size={14} className="text-white" />}
              onClick={() => navigate("/user/auth?redirect=/planos")}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white pl-5 pr-4 py-2.5 shadow-[0_10px_25px_-8px_rgba(49,142,241,0.6)]"
              textWrapperClassName="text-sm font-semibold"
              circleClassName="w-4 h-4"
            />
          </div>

          <button className="md:hidden text-white p-2" onClick={() => setMobileOpen((v) => !v)} aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="md:hidden fixed inset-x-0 bottom-0 z-50 mx-3 mb-3 rounded-2xl bg-[#0F2038] border border-white/10 p-6"
            >
              <div className="flex flex-col mb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="py-2.5 text-2xl font-medium text-white"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileOpen(false);
                      // pequeno atraso pra deixar o painel mobile fechar antes
                      // de animar o scroll, senão os dois movimentos competem.
                      setTimeout(() => scrollToSection(link.href), 350);
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/user/auth?redirect=/planos");
                }}
                className="btn-cta w-full justify-center"
              >
                ASSINE AGORA →
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
