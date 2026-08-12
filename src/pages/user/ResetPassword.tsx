import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthShell } from '@/components/auth/AuthShell';
import { RollButton } from '@/components/landing/RollButton';

const shellProps = {
  title: 'Seller Finance',
  description: 'Gerencie seus resultados de vendas de forma simples e eficiente — lucro real, precificação e DRE em um só lugar.',
  backTo: '/user/auth',
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Senha é obrigatória';
  if (password.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'Senha deve conter pelo menos uma letra maiúscula';
  if (!/[0-9]/.test(password)) return 'Senha deve conter pelo menos um número';
  return null;
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [touched, setTouched] = useState<{ password: boolean; confirmPassword: boolean }>({
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if this is a recovery session (user clicked the reset link)
      if (session?.user) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();

    // Listen for auth state changes (when user clicks the reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      } else if (session?.user) {
        setIsValidSession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched.password) {
      setErrors(prev => ({ ...prev, password: validatePassword(value) || undefined }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: value !== password ? 'As senhas não coincidem' : undefined,
      }));
    }
  };

  const handleBlur = (field: 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'password') {
      setErrors(prev => ({ ...prev, password: validatePassword(password) || undefined }));
    } else {
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmPassword !== password ? 'As senhas não coincidem' : undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirmPassword: true });

    const passwordError = validatePassword(password);
    const confirmError = confirmPassword !== password ? 'As senhas não coincidem' : null;

    if (passwordError || confirmError) {
      setErrors({
        password: passwordError || undefined,
        confirmPassword: confirmError || undefined,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success('Senha alterada com sucesso!');
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/user/auth', { replace: true });
    } catch (err: unknown) {
      console.error('Error updating password:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar senha. Tente novamente.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center bg-background"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#318EF1]" />
      </motion.div>
    );
  }

  // Invalid session - redirect to forgot password
  if (isValidSession === false) {
    return (
      <AuthShell {...shellProps}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="mx-auto p-4 bg-red-100 rounded-full w-fit mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#0A1628] mb-2">Link inválido ou expirado</h2>
          <p className="text-sm text-gray-500 mb-8">
            O link de recuperação de senha é inválido ou já expirou. Por favor, solicite um novo link.
          </p>
          <div className="space-y-3">
            <RollButton
              onClick={() => navigate('/user/esqueci-senha')}
              label="Solicitar novo link"
              icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
              className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
              textWrapperClassName="text-base font-bold"
              circleClassName="w-4 h-4"
            />
            <button
              onClick={() => navigate('/user/auth')}
              className="w-full text-sm font-medium text-gray-500 hover:text-[#0A1628] transition-colors py-2"
            >
              Voltar para login
            </button>
          </div>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...shellProps}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[#318EF1]/10 rounded-full shrink-0">
            <ShieldCheck className="h-5 w-5 text-[#318EF1]" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0A1628]">Criar nova senha</h2>
            <p className="text-sm text-gray-500">Mínimo 8 caracteres, 1 maiúscula e 1 número.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`pl-10 pr-10 ${
                  errors.password && touched.password
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : !errors.password && touched.password && password
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && touched.password && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`pl-10 pr-10 ${
                  errors.confirmPassword && touched.confirmPassword
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : !errors.confirmPassword && touched.confirmPassword && confirmPassword
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && touched.confirmPassword && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmPassword}
              </p>
            )}
            {!errors.confirmPassword && touched.confirmPassword && confirmPassword && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Senhas coincidem
              </p>
            )}
          </div>

          <RollButton
            type="submit"
            disabled={isLoading}
            label={
              isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </span>
              ) : (
                'Salvar nova senha'
              )
            }
            icon={<ArrowRight className="w-3.5 h-3.5 text-white" />}
            className="bg-[#318EF1] hover:bg-[#2678d1] text-white w-full justify-center py-3.5 shadow-[0_8px_24px_-8px_rgba(49,142,241,0.5)]"
            textWrapperClassName="text-base font-bold"
            circleClassName="w-4 h-4"
          />
        </form>
      </motion.div>
    </AuthShell>
  );
}