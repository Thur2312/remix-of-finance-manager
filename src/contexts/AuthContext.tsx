import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { computePlanStatus } from '@/lib/plan-status';


export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  created_at: string; // Data de criação do perfil
  is_admin: boolean;
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

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, plan, trial_ends_at, created_at, is_admin')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data as unknown as Profile);

        // computePlanStatus é a mesma classificação usada por useTrialStatus —
        // antes cada hook tinha sua própria lista de PAID_PLANS/lógica de
        // expiração, que podiam divergir sem ninguém notar.
        const status = computePlanStatus({
          rawPlan: (data as any).plan,
          trialEndsAt: (data as any).trial_ends_at,
        });

        setIsTrialExpired(status.isTrialExpired);
        setTrialDaysRemaining(status.daysRemaining);
        setPlan(status.effectivePlanForPermissions);

        // Buscar as permissões do plano. Quando bloqueado (trial vencido ou
        // cancelado), effectivePlanForPermissions é um sentinela sem linha
        // correspondente em plan_permissions — retorna vazio de propósito.
        await fetchPlanPermissions(status.effectivePlanForPermissions);
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
        .from('plan_permissions')
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
          // Sem isso, o cache do React Query (persistido em localStorage por até
          // 24h) podia sobreviver ao logout e vazar dados da conta anterior para
          // a próxima pessoa que logasse no mesmo navegador.
          queryClient.clear();
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