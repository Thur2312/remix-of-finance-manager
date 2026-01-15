import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Loader2, User } from 'lucide-react';
import { validateCPF, formatCPF, validatePhone, formatPhone, validateEmail, validateName } from '@/lib/validations';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
}

function PerfilContent() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          phone: data.phone ? formatPhone(data.phone) : '',
          cpf: data.cpf ? formatCPF(data.cpf) : '',
        });
      } else {
        // Create profile if doesn't exist
        setFormData({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: '',
          cpf: '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === 'phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'cpf') {
      formattedValue = formatCPF(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!validateName(formData.full_name)) {
      newErrors.full_name = 'Nome deve ter pelo menos 4 caracteres';
    }

    if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido. Use um domínio válido (Gmail, Hotmail, Outlook, etc.)';
    }

    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Telefone deve estar no formato (XX) XXXXX-XXXX';
    }

    if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido. Verifique os dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    try {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      const cleanCPF = formData.cpf.replace(/\D/g, '');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: cleanPhone,
          cpf: cleanCPF,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          setErrors({ cpf: 'Este CPF já está cadastrado' });
          throw new Error('CPF já cadastrado');
        }
        throw error;
      }

      toast.success('Perfil atualizado com sucesso!');
      await fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      if (!error.message?.includes('CPF')) {
        toast.error('Erro ao salvar perfil');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Meu Perfil</CardTitle>
              <CardDescription>Gerencie suas informações pessoais</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Seu nome completo"
                className={errors.full_name ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                className={errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleInputChange('cpf', e.target.value)}
                placeholder="XXX.XXX.XXX-XX"
                className={errors.cpf ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.cpf && (
                <p className="text-xs text-destructive">{errors.cpf}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Perfil() {
  return (
    <ProtectedRoute>
      <AppLayout title="Meu Perfil">
        <PerfilContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
