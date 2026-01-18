import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast.success('Email enviado com sucesso!');
    } catch (err: any) {
      console.error('Error sending reset email:', err);
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-0 shadow-lg animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Email Enviado!</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full h-11"
            >
              Voltar para Login
            </Button>
            <Button 
              variant="ghost"
              onClick={() => setEmailSent(false)} 
              className="w-full"
            >
              Enviar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-0 shadow-lg animate-fade-in">
        <CardHeader className="space-y-4">
          <button 
            onClick={() => navigate('/auth')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </button>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
            <CardDescription>
              Digite seu email e enviaremos um link para você criar uma nova senha.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
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
                  className={`h-11 pl-10 pr-10 placeholder:text-muted-foreground/50 ${
                    error && touched ? 'border-destructive focus-visible:ring-destructive' : ''
                  } ${!error && touched && email ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {error && touched && <AlertCircle className="h-4 w-4 text-destructive" />}
                  {!error && touched && email && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              {error && touched && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link de recuperação'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
