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
import { motion, AnimatePresence } from 'framer-motion'; // Adicionado AnimatePresence

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

// Animações (adicionadas para alinhar com Landing Page)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
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

  const searchParams = new URLSearchParams(window.location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  // Validações em tempo real (mantidas)
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
      navigate(redirectTo);
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      navigate(redirectTo);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    navigate('/esqueci-senha');
  };

  const InputIcon = ({ isValid, hasError }: { isValid?: boolean; hasError?: boolean }) => {
    if (hasError) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (isValid) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    return null;
  };

   return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 to-blue-200">
      {/* Left side - Illustration em Card */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <Card className="w-full max-w-lg bg-white border border-blue-200 shadow-2xl">
          <CardContent className="p-8 relative">
            {/* Animated background elements azuis */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-cyan-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-100/40 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div 
              className="text-gray-900 space-y-8 relative z-10"
              variants={stagger}
            >
              {/* Logo and title */}
              <motion.div className="space-y-4" variants={fadeInUp}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full shadow-sm border border-blue-200">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Plataforma #1 de Gestão</span>
                </div>
                <h1 className="text-5xl font-bold leading-tight">
                  Finance Manager
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Transforme dados de vendas em decisões estratégicas com nossa plataforma inteligente.
                </p>
              </motion.div>

              {/* Modern stats illustration azul */}
              <motion.div className="relative mt-12" variants={fadeInUp}>
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Receita Mensal</span>
                    <div className="flex items-center gap-1 text-green-600">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-sm font-bold">+32%</span>
                    </div>
                  </div>
                  
                  {/* Animated chart bars azuis */}
                  <div className="flex items-end gap-3 h-32 mb-4">
                    {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t-lg transition-all duration-1000 hover:from-blue-600 hover:to-cyan-600"
                        style={{ 
                          height: `${height}%`,
                          animation: `grow 1s ease-out ${i * 0.1}s both`
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Jan</span>
                    <span>Fev</span>
                    <span>Mar</span>
                    <span>Abr</span>
                    <span>Mai</span>
                    <span>Jun</span>
                    <span>Jul</span>
                  </div>
                </div>

                {/* Floating cards azuis */}
                <motion.div 
                  className="absolute -right-4 top-0 bg-white rounded-xl p-4 border border-blue-200 shadow-lg"
                  variants={fadeInUp}
                  style={{ animationDelay: '0.5s' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Lucro</p>
                      <p className="font-bold text-gray-900">R$ 45.2k</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute -left-4 bottom-4 bg-white rounded-xl p-4 border border-blue-200 shadow-lg"
                  variants={fadeInUp}
                  style={{ animationDelay: '0.8s' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <PieChart className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Margem</p>
                      <p className="font-bold text-gray-900">28.5%</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Features list azul */}
              <motion.div className="grid grid-cols-3 gap-4 pt-8" variants={stagger}>
                <motion.div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200" variants={fadeInUp}>
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Análises</p>
                </motion.div>
                <motion.div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200" variants={fadeInUp}>
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Finanças</p>
                </motion.div>
                <motion.div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200" variants={fadeInUp}>
                  <BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Relatórios</p>
                </motion.div>
              </motion.div>
            </motion.div>

            <style>{`
              @keyframes grow {
                from { height: 0; opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </CardContent>
        </Card>
      </motion.div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          className="w-full max-w-md"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-2 mb-8">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Manager</h1>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border border-blue-200">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Cadastrar</TabsTrigger>
            </TabsList>

            <Card className="border border-blue-200 shadow-lg bg-white min-h-[600px]">
              <AnimatePresence mode="wait">
                <TabsContent value="login" key="login">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-2xl text-gray-900">Bem-vindo de volta!</CardTitle>
                      <CardDescription className="text-gray-600">
                        Entre com suas credenciais para acessar o sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                        <div className="space-y-2">
                          <Label htmlFor="email-login" className="text-gray-900">Email</Label>
                          <div className="relative">
                            <Input 
                              id="email-login" 
                              type="email" 
                              placeholder="exemplo@gmail.com" 
                              className={`h-11 pr-10 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.email && touched.email ? 'border-red-500 focus:ring-red-500' : ''
                              } ${valid.email ? 'border-green-500 focus:ring-green-500' : ''}`}
                              value={email} 
                              onChange={e => setEmail(e.target.value)}
                              onBlur={() => handleBlur('email')}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <InputIcon isValid={valid.email} hasError={!!errors.email && touched.email} />
                            </div>
                          </div>
                          {errors.email && touched.email && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password-login" className="text-gray-900">Senha</Label>
                          <div className="relative">
                            <Input 
                              id="password-login" 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Digite sua senha" 
                              className={`h-11 pr-16 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.password && touched.password ? 'border-red-500 focus:ring-red-500' : ''
                              }`}
                              value={password} 
                              onChange={e => setPassword(e.target.value)}
                              onBlur={() => handleBlur('password')}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          {errors.password && touched.password && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
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
                              className="border-blue-200"
                            />
                            <label
                              htmlFor="remember"
                              className="text-sm text-gray-600 cursor-pointer"
                            >
                              Lembrar de mim
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Esqueci minha senha
                          </button>
                        </div>

                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-300" disabled={isLoading}>
                          {isLoading ? 'Entrando...' : 'Entrar'}
                        </Button>
                      </form>
                    </CardContent>
                  </motion.div>
                </TabsContent>

                <TabsContent value="register" key="register">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-2xl text-gray-900">Criar conta</CardTitle>
                      <CardDescription className="text-gray-600">
                        Preencha os dados abaixo para criar sua conta
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                        <div className="space-y-2">
                          <Label htmlFor="name-register" className="text-gray-900">Nome completo</Label>
                          <div className="relative">
                            <Input 
                              id="name-register" 
                              type="text" 
                              placeholder="João da Silva" 
                              className={`h-11 pr-10 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.fullName && touched.fullName ? 'border-red-500 focus:ring-red-500' : ''
                              } ${valid.fullName ? 'border-green-500 focus:ring-green-500' : ''}`}
                              value={fullName} 
                              onChange={e => setFullName(e.target.value)}
                              onBlur={() => handleBlur('fullName')}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <InputIcon isValid={valid.fullName} hasError={!!errors.fullName && touched.fullName} />
                            </div>
                          </div>
                          {errors.fullName && touched.fullName && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.fullName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email-register" className="text-gray-900">Email</Label>
                          <div className="relative">
                            <Input 
                              id="email-register" 
                              type="email" 
                              placeholder="exemplo@gmail.com" 
                              className={`h-11 pr-10 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.email && touched.email ? 'border-red-500 focus:ring-red-500' : ''
                              } ${valid.email ? 'border-green-500 focus:ring-green-500' : ''}`}
                              value={email} 
                              onChange={e => setEmail(e.target.value)}
                              onBlur={() => handleBlur('email')}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <InputIcon isValid={valid.email} hasError={!!errors.email && touched.email} />
                            </div>
                          </div>
                          {errors.email && touched.email && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone-register" className="text-gray-900">Telefone</Label>
                          <div className="relative">
                            <Input 
                              id="phone-register" 
                              type="tel" 
                              placeholder="(XX) XXXXX-XXXX" 
                              className={`h-11 pr-10 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.phone && touched.phone ? 'border-red-500 focus:ring-red-500' : ''
                              } ${valid.phone ? 'border-green-500 focus:ring-green-500' : ''}`}
                              value={phone} 
                              onChange={e => setPhone(e.target.value)}
                              onBlur={() => handleBlur('phone')}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <InputIcon isValid={valid.phone} hasError={!!errors.phone && touched.phone} />
                            </div>
                          </div>
                          {errors.phone && touched.phone && ( 
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.phone}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password-register" className="text-gray-900">Senha</Label>
                          <div className="relative">
                            <Input 
                              id="password-register" 
                              type={showPassword ? "text" : "password"} 
                              placeholder="Mínimo 8 caracteres" 
                              className={`h-11 pr-16 placeholder:text-gray-400 border-blue-200 focus:border-blue-500 focus:ring-blue-500 ${
                                errors.password && touched.password ? 'border-red-500 focus:ring-red-500' : ''
                              } ${valid.password ? 'border-green-500 focus:ring-green-500' : ''}`}
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
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          {errors.password && touched.password ? (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {errors.password}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Mínimo 8 caracteres, 1 maiúscula e 1 número
                            </p>
                          )}
                        </div>
                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-300" disabled={isLoading}>
                          {isLoading ? 'Criando conta...' : 'Criar conta'}
                        </Button>
                      </form>
                    </CardContent>
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Card>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}