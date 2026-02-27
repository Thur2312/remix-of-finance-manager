import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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

const VALID_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'zoho.com',
  'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com'
];

const validateEmail = (email: string): string | null => {
  if (!email) return 'Email é obrigatório';
  if (!email.includes('@')) return 'Email deve conter @';

  const [, domain] = email.split('@');
  if (!domain) return 'Email inválido';

  const isValidDomain = VALID_EMAIL_DOMAINS.some(d =>
    domain.toLowerCase() === d || domain.toLowerCase().endsWith('.' + d)
  );

  if (!isValidDomain) {
    return 'Use um email válido (Gmail, Hotmail, Outlook, etc.)';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Formato de email inválido';

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
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        { redirectTo: redirectUrl }
      );

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

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-blue-50 to-white">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="w-full max-w-md"
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="text-center space-y-4 bg-blue-50 border-b border-blue-200">
              <div className="mx-auto p-4 bg-green-100 rounded-full w-fit">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Email Enviado!</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Se o email estiver cadastrado, você receberá um link de recuperação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Button
                onClick={() => navigate('/user/auth')}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
              >
                Voltar para Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-blue-50 to-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="w-full max-w-md"
      >
        <motion.div variants={fadeInUp}>
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="space-y-4 bg-blue-50 border-b border-blue-200">
              <button
                onClick={() => navigate('/user/auth')}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para login
              </button>
              <div className="space-y-2">
                <CardTitle className="text-2xl text-gray-900">Esqueceu sua senha?</CardTitle>
                <CardDescription className="text-gray-600">
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
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
                      className="h-11 pl-10 border-blue-200 focus:border-blue-500"
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
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar link de recuperação'
                    )}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}