import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BarChart3, Eye, EyeOff, Sparkles, ArrowUpRight, PieChart } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Deve ter letra maiúscula')
  .regex(/[0-9]/, 'Deve ter número');

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const {
    signIn,
    signUp,
    signInWithGoogle,
    user
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
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
    
    const { error } = await signUp(email, password, fullName);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Erro ao entrar com Google');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    toast.info('Funcionalidade em desenvolvimento. Entre em contato com o suporte.');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Modern Illustration */}
      <div className="hidden lg:flex lg:w-1/2 finance-gradient items-center justify-center p-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="text-primary-foreground max-w-lg space-y-8 relative z-10">
          {/* Logo and title */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Plataforma #1 de Gestão</span>
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Seller Finance
            </h1>
            <p className="text-xl opacity-90 leading-relaxed">
              Transforme dados de vendas em decisões estratégicas com nossa plataforma inteligente.
            </p>
          </div>

          {/* Modern stats illustration */}
          <div className="relative mt-12">
            {/* Main chart card */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium opacity-80">Receita Mensal</span>
                <div className="flex items-center gap-1 text-green-300">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-sm font-bold">+32%</span>
                </div>
              </div>
              
              {/* Animated chart bars */}
              <div className="flex items-end gap-3 h-32 mb-4">
                {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                  <div 
                    key={i} 
                    className="flex-1 bg-white/30 rounded-t-lg transition-all duration-1000 hover:bg-white/50"
                    style={{ 
                      height: `${height}%`,
                      animation: `grow 1s ease-out ${i * 0.1}s both`
                    }}
                  />
                ))}
              </div>
              
              <div className="flex justify-between text-xs opacity-70">
                <span>Jan</span>
                <span>Fev</span>
                <span>Mar</span>
                <span>Abr</span>
                <span>Mai</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -right-4 top-0 bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-400/30 rounded-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs opacity-70">Lucro</p>
                  <p className="font-bold">R$ 45.2k</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-4 bottom-4 bg-white/20 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg animate-fade-in" style={{ animationDelay: '0.8s' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-400/30 rounded-lg">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs opacity-70">Margem</p>
                  <p className="font-bold">28.5%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className="grid grid-cols-3 gap-4 pt-8">
            <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Análises</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <DollarSign className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Finanças</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Relatórios</p>
            </div>
          </div>
        </div>

        {/* CSS for grow animation */}
        <style>{`
          @keyframes grow {
            from { height: 0; opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-2 mb-8">
            <div className="p-3 finance-gradient rounded-xl">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-primary">Seller Finance</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
                  <CardDescription>
                    Entre com suas credenciais para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Google Sign In */}
                  <Button 
                    variant="outline" 
                    className="w-full h-11 gap-3" 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continuar com Google
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Email</Label>
                      <Input 
                        id="email-login" 
                        type="email" 
                        placeholder="exemplo@email.com" 
                        className="h-11 placeholder:text-muted-foreground/40"
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
                          type={showPassword ? "text" : "password"} 
                          placeholder="Digite sua senha" 
                          className="h-11 pr-10 placeholder:text-muted-foreground/40"
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="remember" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Lembrar de mim
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-sm text-primary hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-0 shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl">Criar conta</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo para criar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Google Sign In */}
                  <Button 
                    variant="outline" 
                    className="w-full h-11 gap-3" 
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continuar com Google
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-register">Nome completo</Label>
                      <Input 
                        id="name-register" 
                        type="text" 
                        placeholder="João da Silva" 
                        className="h-11 placeholder:text-muted-foreground/40"
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
                        placeholder="exemplo@email.com" 
                        className="h-11 placeholder:text-muted-foreground/40"
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
                          type={showPassword ? "text" : "password"} 
                          placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número" 
                          className="h-11 pr-10 placeholder:text-muted-foreground/40"
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          required 
                          minLength={8} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                      {isLoading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}