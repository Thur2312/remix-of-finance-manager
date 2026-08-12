import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BarChart3, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { validateName } from '@/lib/validations';
import { AuthShell } from '@/components/auth/AuthShell';
import { RollButton } from '@/components/landing/RollButton';

const highlights = [
  { icon: TrendingUp, title: 'Acompanhe suas vendas', desc: 'Visualize relatórios detalhados' },
  { icon: DollarSign, title: 'Calcule seu lucro', desc: 'Taxas, impostos e custos automáticos' },
  { icon: BarChart3, title: 'Análise por produto', desc: 'Identifique seus melhores itens' },
];

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve ter letra maiúscula')
  .regex(/[0-9]/, 'Deve ter número');

export default function Auth() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [fullName, setFullName]     = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword]     = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const { signIn, signUp, user, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/fluxo-caixa';

  // Redireciona usuário já logado
  useEffect(() => {
    if (!loading && user) {
      const pendingCode = sessionStorage.getItem('pending_oauth_code');
      if (pendingCode) {
        navigate('/callback', { replace: true });
      } else {
        navigate(redirectPath, { replace: true });
      }
    }
  }, [user, loading, navigate, redirectPath]);

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(
        error.message.includes('Invalid login credentials')
          ? 'Email ou senha incorretos'
          : 'Não foi possível entrar. Tente novamente em instantes.'
      );
    } else {
      toast.success('Login realizado com sucesso!');
      const pendingCode = sessionStorage.getItem('pending_oauth_code');
      navigate(pendingCode ? '/callback' : redirectPath, { replace: true });
    }

    setIsLoading(false);
  };

  // ── Cadastro ─────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    if (!validateName(fullName)) {
      toast.error('Nome completo deve ter pelo menos 4 caracteres');
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(
        error.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : 'Não foi possível criar sua conta. Tente novamente em instantes.'
      );
    } else {
      toast.success('Conta criada! Você tem 5 dias grátis para testar tudo.');
      navigate(redirectPath, { replace: true });
    }

    setIsLoading(false);
  };

  return (
    <AuthShell
      title="Seller Finance"
      description="Gerencie seus resultados de vendas de forma simples e eficiente — lucro real, precificação e DRE em um só lugar."
      highlights={highlights}
    >
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 rounded-full p-1 h-11">
          <TabsTrigger
            value="login"
            className="rounded-full text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#318EF1] data-[state=active]:shadow-sm"
          >
            Entrar
          </TabsTrigger>
          <TabsTrigger
            value="register"
            className="rounded-full text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#318EF1] data-[state=active]:shadow-sm"
          >
            Cadastrar
          </TabsTrigger>
        </TabsList>

        {/* Login */}
        <TabsContent value="login">
          <h2 className="font-display text-2xl font-bold text-[#0A1628] mb-1">Bem-vindo de volta!</h2>
          <p className="text-sm text-gray-500 mb-6">Entre com suas credenciais para acessar o sistema</p>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-login">Email</Label>
              <Input
                id="email-login"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Senha</Label>
              <div className="relative">
                <Input
                  id="password-login"
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <RollButton
              type="submit"
              disabled={isLoading}
              label={
                isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                  </span>
                ) : (
                  'Entrar'
                )
              }
              icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
              textWrapperClassName="text-base font-bold"
              circleClassName="w-4 h-4"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Lembrar de mim
              </label>
            </div>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Esqueceu a senha?{' '}
            <span className="text-[#318EF1] font-medium cursor-pointer" onClick={() => navigate('/user/esqueci-senha')}>
              Recuperar senha
            </span>
          </p>
        </TabsContent>

        {/* Cadastro */}
        <TabsContent value="register">
          <h2 className="font-display text-2xl font-bold text-[#0A1628] mb-1">Criar conta</h2>
          <p className="text-sm text-gray-500 mb-6">Preencha os dados abaixo para criar sua conta</p>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name-register">Nome completo</Label>
              <Input
                id="name-register"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-register">Email</Label>
              <Input
                id="email-register"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-register">Senha</Label>
              <div className="relative">
                <Input
                  id="password-register"
                  type={showRegisterPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <RollButton
              type="submit"
              disabled={isLoading}
              label={
                isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Criando conta...
                  </span>
                ) : (
                  'Criar conta'
                )
              }
              icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
              textWrapperClassName="text-base font-bold"
              circleClassName="w-4 h-4"
            />
          </form>
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}