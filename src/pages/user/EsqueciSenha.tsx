import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { validateEmail as isValidEmailFormat } from '@/lib/validations';
import { AuthShell } from '@/components/auth/AuthShell';
import { RollButton } from '@/components/landing/RollButton';


const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

// Antes havia uma whitelist fixa de domínios pessoais (gmail/hotmail/...) que
// bloqueava e-mails corporativos/próprios de recuperar senha — inaceitável
// num SaaS B2B. Reusa a mesma validação de src/lib/validations.ts usada no
// resto do app (aceita qualquer domínio bem formado).
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email é obrigatório';
  if (!isValidEmailFormat(email)) return 'Formato de email inválido';
  return null;
};

export default function EsqueciSenha() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setTouched(true);

  const emailError = validateEmail(email);
  if (emailError) {
    setError(emailError);
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const redirectUrl = `${window.location.origin}/user/reset-password`;

    const { error } = await supabase.functions.invoke('send-password-reset', { body: { email: email.toLowerCase(), redirectUrl } })

    if (error) throw error;

    setEmailSent(true);
    toast.success('Se o email estiver cadastrado, você receberá um link de recuperação.');
  } catch (err: unknown) {
    console.error('Erro ao enviar reset:', err);
    toast.error('Erro ao enviar email. Tente novamente.');
  } finally {
    setIsLoading(false);
  }
};

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched) {
      setError(validateEmail(value));
    }
  };

  const shellProps = {
    title: 'Seller Finance',
    description: 'Gerencie seus resultados de vendas de forma simples e eficiente — lucro real, precificação e DRE em um só lugar.',
    backTo: '/user/auth',
  };

  if (emailSent) {
    return (
      <AuthShell {...shellProps}>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-center">
          <div className="mx-auto p-4 bg-[#318EF1]/10 rounded-full w-fit mb-4">
            <CheckCircle2 className="h-8 w-8 text-[#318EF1]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#0A1628] mb-2">Email enviado!</h2>
          <p className="text-sm text-gray-500 mb-8">
            Se o email estiver cadastrado, você receberá um link de recuperação.
          </p>
          <RollButton
            onClick={() => navigate('/user/auth')}
            label="Voltar para login"
            icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
            className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
            textWrapperClassName="text-base font-bold"
            circleClassName="w-4 h-4"
          />
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...shellProps}>
      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        <h2 className="font-display text-2xl font-bold text-[#0A1628] mb-1">Esqueceu sua senha?</h2>
        <p className="text-sm text-gray-500 mb-6">
          Digite seu email e enviaremos um link para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <motion.div variants={fadeInUp} className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setTouched(true)}
                className="pl-10"
              />
            </div>
            {error && touched && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
          </motion.div>

          <motion.div variants={fadeInUp}>
            <RollButton
              type="submit"
              disabled={isLoading}
              label={
                isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </span>
                ) : (
                  'Enviar link de recuperação'
                )
              }
              icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
              textWrapperClassName="text-base font-bold"
              circleClassName="w-4 h-4"
            />
          </motion.div>
        </form>
      </motion.div>
    </AuthShell>
  );
}