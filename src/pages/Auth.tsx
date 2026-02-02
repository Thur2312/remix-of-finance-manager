import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, BarChart3, Eye, EyeOff, Sparkles, ArrowUpRight, PieChart, AlertCircle, CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react';

// Domínios de email válidos
const VALID_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com', 'zoho.com',
  'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com'
];

import { validatePhone, formatPhone } from '@/lib/validations';

interface ValidationErrors {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
}

interface ValidationStatus {
  email?: boolean;
  password?: boolean;
  fullName?: boolean;
  phone?: boolean;
}

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
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Formato de email inválido';
  
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Senha é obrigatória';
  if (password.length < 8) return 'Senha deve ter no mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Senha deve ter pelo menos uma letra maiúscula';
  if (!/[0-9]/.test(password)) return 'Senha deve ter pelo menos um número';
  return null;
};

const validateFullName = (name: string): string | null => {
  if (!name) return 'Nome é obrigatório';
  if (name.trim().length < 4) return 'Nome deve ter no mínimo 4 caracteres';
  return null;
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<ValidationStatus>({});
  const [valid, setValid] = useState<ValidationStatus>({});

  const {
    signIn,
    signUp,
    user
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Real-time validation
  useEffect(() => {
    if (touched.email) {
      const error = validateEmail(email);
      setErrors(prev => ({ ...prev, email: error || undefined }));
      setValid(prev => ({ ...prev, email: !error && email.length > 0 }));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error || undefined }));
      setValid(prev => ({ ...prev, password: !error && password.length > 0 }));
    }
  }, [password, touched.password]);

  useEffect(() => {
    if (touched.fullName) {
      const error = validateFullName(fullName);
      setErrors(prev => ({ ...prev, fullName: error || undefined }));
      setValid(prev => ({ ...prev, fullName: !error && fullName.length > 0 }));
    }
  }, [fullName, touched.fullName]);

  useEffect(() => {
    if (touched.phone) {
      const isValid = validatePhone(phone);
      setErrors(prev => ({ ...prev, phone: isValid ? undefined : 'Telefone deve estar no formato (XX) XXXXX-XXXX' }));
      setValid(prev => ({ ...prev, phone: isValid && phone.length > 0 }));
    }
  }, [phone, touched.phone]);

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleBlur = (field: keyof ValidationStatus) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true });
    
    const emailError = validateEmail(email);
    
    if (emailError) {
      setErrors(prev => ({ ...prev, email: emailError }));
      return;
    }
    
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Senha é obrigatória' }));
      return;
    }
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ email: true, password: true, fullName: true, phone: true });
    
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const nameError = validateFullName(fullName);
    const phoneValid = validatePhone(phone);
    
    const newErrors: ValidationErrors = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;
    if (nameError) newErrors.fullName = nameError;
    if (!phoneValid) newErrors.phone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    } else {
      // Save phone to profile after signup
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    navigate('/esqueci-senha');
  };

  const InputIcon = ({ isValid, hasError }: { isValid?: boolean; hasError?: boolean }) => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (isValid) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return null;
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
      <div className="flex-1 flex flex-col bg-background">
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-4 md:p-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar ao início</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
          </Link>
          <Link to="/#planos">
            <Button variant="outline" size="sm" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Ver planos</span>
              <span className="sm:hidden">Planos</span>
            </Button>
          </Link>
        </div>

        {/* Auth Form Container */}
        <div className="flex-1 flex items-center justify-center p-8">
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
                  <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="email-login">Email</Label>
                      <div className="relative">
                        <Input 
                          id="email-login" 
                          type="email" 
                          placeholder="exemplo@gmail.com" 
                          className={`h-11 pr-10 placeholder:text-muted-foreground/40 ${
                            errors.email && touched.email ? 'border-destructive focus-visible:ring-destructive' : ''
                          } ${valid.email ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          value={email} 
                          onChange={e => setEmail(e.target.value)}
                          onBlur={() => handleBlur('email')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <InputIcon isValid={valid.email} hasError={!!errors.email && touched.email} />
                        </div>
                      </div>
                      {errors.email && touched.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-login">Senha</Label>
                      <div className="relative">
                        <Input 
                          id="password-login" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Digite sua senha" 
                          className={`h-11 pr-16 placeholder:text-muted-foreground/40 ${
                            errors.password && touched.password ? 'border-destructive focus-visible:ring-destructive' : ''
                          }`}
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          onBlur={() => handleBlur('password')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {errors.password && touched.password && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.password}
                        </p>
                      )}
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
                  <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="name-register">Nome completo</Label>
                      <div className="relative">
                        <Input 
                          id="name-register" 
                          type="text" 
                          placeholder="João da Silva" 
                          className={`h-11 pr-10 placeholder:text-muted-foreground/40 ${
                            errors.fullName && touched.fullName ? 'border-destructive focus-visible:ring-destructive' : ''
                          } ${valid.fullName ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          value={fullName} 
                          onChange={e => setFullName(e.target.value)}
                          onBlur={() => handleBlur('fullName')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <InputIcon isValid={valid.fullName} hasError={!!errors.fullName && touched.fullName} />
                        </div>
                      </div>
                      {errors.fullName && touched.fullName && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.fullName}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-register">Email</Label>
                      <div className="relative">
                        <Input 
                          id="email-register" 
                          type="email" 
                          placeholder="exemplo@gmail.com" 
                          className={`h-11 pr-10 placeholder:text-muted-foreground/40 ${
                            errors.email && touched.email ? 'border-destructive focus-visible:ring-destructive' : ''
                          } ${valid.email ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          value={email} 
                          onChange={e => setEmail(e.target.value)}
                          onBlur={() => handleBlur('email')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <InputIcon isValid={valid.email} hasError={!!errors.email && touched.email} />
                        </div>
                      </div>
                      {errors.email && touched.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone-register">Telefone</Label>
                      <div className="relative">
                        <Input 
                          id="phone-register" 
                          type="tel" 
                          placeholder="(XX) XXXXX-XXXX" 
                          className={`h-11 pr-10 placeholder:text-muted-foreground/50 ${
                            errors.phone && touched.phone ? 'border-destructive focus-visible:ring-destructive' : ''
                          } ${valid.phone ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          value={phone} 
                          onChange={e => handlePhoneChange(e.target.value)}
                          onBlur={() => handleBlur('phone')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <InputIcon isValid={valid.phone} hasError={!!errors.phone && touched.phone} />
                        </div>
                      </div>
                      {errors.phone && touched.phone && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.phone}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-register">Senha</Label>
                      <div className="relative">
                        <Input 
                          id="password-register" 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Mínimo 8 caracteres" 
                          className={`h-11 pr-16 placeholder:text-muted-foreground/40 ${
                            errors.password && touched.password ? 'border-destructive focus-visible:ring-destructive' : ''
                          } ${valid.password ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          value={password} 
                          onChange={e => setPassword(e.target.value)}
                          onBlur={() => handleBlur('password')}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {touched.password && (
                            <InputIcon isValid={valid.password} hasError={!!errors.password} />
                          )}
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      {errors.password && touched.password ? (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.password}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Mínimo 8 caracteres, 1 maiúscula e 1 número
                        </p>
                      )}
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
    </div>
  );
}
