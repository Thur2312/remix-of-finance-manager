import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';
import { set } from 'date-fns';


export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  created_at: string; // Data de criação do perfil
  data: any; // Campo para armazenar dados adicionais, como permissões do plano, etc.
}

export interface PlanPermission {
  permission: string;
  limit_value: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  plan: string | null;
  permissions: PlanPermission[];
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  getPermissionLimit: (permission: string) => number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PlanPermission[]>([]);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

  /**
   * Calcula se o trial expirou e quantos dias restam, com base em
   * profiles.trial_ends_at (data real definida pelo Stripe no checkout).
   * Fonte única de verdade, compartilhada com useTrialStatus.
   */
  const calculateTrialStatus = (trialEndsAt: string | null): { isExpired: boolean; daysRemaining: number } => {
    if (!trialEndsAt) {
      return { isExpired: true, daysRemaining: 0 };
    }

    const diffMs = new Date(trialEndsAt).getTime() - new Date().getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = diffMs <= 0;

    return { isExpired, daysRemaining };
  };

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, plan, trial_ends_at, created_at')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data as unknown as Profile);

        // Determinar o plano efetivo. Sem plano definido = nunca completou o
        // checkout no Stripe, então não tem trial nem acesso pago.
        let effectivePlan = (data as any).plan || 'sem_plano';

        // Se o plano é trial, verificar se expirou (com base na data real do Stripe)
        if (effectivePlan === 'trial') {
          const { isExpired, daysRemaining } = calculateTrialStatus((data as any).trial_ends_at);
          setIsTrialExpired(isExpired);
          setTrialDaysRemaining(daysRemaining);

          // Se trial expirou, mudar para basico
          if (isExpired) {
            effectivePlan = 'basico';
          }
        } else {
          // sem_plano = nunca passou pelo checkout, não é trial expirado
          // (mesma regra de useTrialStatus.ts)
          setIsTrialExpired(false);
          setTrialDaysRemaining(0);
        }

        setPlan(effectivePlan);

        // Buscar as permissões do plano
        await fetchPlanPermissions(effectivePlan);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchPlanPermissions = async (planName: string) => {
    try {
      const { data, error } = await supabase
        .from('plan_permissions' as any)
        .select('permission, limit_value')
        .eq('plan', planName);

      if (error) {
        console.error('Error fetching plan permissions:', error);
        return;
      }

      if (data) {
        setPermissions(data as unknown as PlanPermission[]);
      }
    } catch (error) {
      console.error('Error fetching plan permissions:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.some(p => p.permission === permission);
  };

  const getPermissionLimit = (permission: string): number | null => {
    const perm = permissions.find(p => p.permission === permission);
    return perm?.limit_value ?? null;
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch profile when user logs in (using setTimeout to avoid deadlock)
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setPlan(null);
          setPermissions([]);
          setIsTrialExpired(false);
          setTrialDaysRemaining(0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };



  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPlan(null);
    setPermissions([]);
    setIsTrialExpired(false);

    setTrialDaysRemaining(0);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      profileLoading, 
      plan,
      permissions,
      isTrialExpired,
      trialDaysRemaining,
      signUp, 
      signIn, 
      signOut,
      refreshProfile,
      hasPermission,
      getPermissionLimit
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

//teste