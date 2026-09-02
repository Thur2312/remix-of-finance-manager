import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Save, Loader2, User, Camera, Smartphone, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageShell } from '@/components/layout/PageShell';
import { validatePhone, formatPhone, validateEmail, validateName } from '@/lib/validations';
import { usePwaInstall } from '@/hooks/usePwaInstall';

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
}

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

function PerfilContent() {
  const { user, refreshProfile } = useAuth();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingData, setIsDeletingData] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const fetchProfile = useCallback(async () => {
    if (!user?.id) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setAvatarUrl(data.avatar_url);
        setFormData({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          phone: data.phone ? formatPhone(data.phone) : '',
        });
      } else {
        setFormData({
          full_name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
          phone: '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [fetchProfile, user]);

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === 'phone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setErrors(prev => ({ ...prev, [field]: '' }));
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + '?t=' + Date.now()); // Add timestamp to force refresh
      toast.success('Foto atualizada com sucesso!');

      // Refresh the profile in AuthContext to sync everywhere
      await refreshProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);
    try {
      const cleanPhone = formData.phone.replace(/\D/g, '');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      await fetchProfile();

      // Refresh the profile in AuthContext to sync everywhere
      await refreshProfile();
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstallApp = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success('App instalado com sucesso!');
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'APAGAR' || !user) return;

    setIsDeletingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account-data');

      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data?.message || 'Alguns dados não puderam ser apagados.');
      }

      toast.success('Todos os seus dados foram apagados.');
      setIsDeleteDialogOpen(false);
      setDeleteConfirmText('');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error deleting account data:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao apagar os dados da conta');
    } finally {
      setIsDeletingData(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell
      icon={User}
      title="Meu Perfil"
      subtitle="Gerencie suas informações pessoais"
      width="narrow"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-6"
      >
        <motion.div variants={fadeInUp}>
          <Card className="panel bg-card border-transparent">
            <CardContent className="space-y-6 pt-6">
              {/* Avatar Section */}
              <motion.div variants={fadeInUp} className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                    <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {getInitials(formData.full_name, formData.email)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique para alterar a foto
                </p>
              </motion.div>

              <motion.div variants={fadeInUp} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Seu nome completo"
                    className={errors.full_name ? 'border-destructive focus-visible:ring-destructive' : undefined}
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
                    className={errors.email ? 'border-destructive focus-visible:ring-destructive' : undefined}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(XX) XXXXX-XXXX"
                    className={errors.phone ? 'border-destructive focus-visible:ring-destructive' : undefined}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone}</p>
                  )}
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Alterações
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {!isInstalled && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">App no celular</CardTitle>
                <CardDescription>Instale o Seller Finance como aplicativo</CardDescription>
              </CardHeader>
              <CardContent>
                {canInstall ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      Adicione o Seller Finance à tela inicial do seu celular ou computador e abra
                      como um app, sem precisar do navegador.
                    </p>
                    <Button onClick={handleInstallApp} className="shrink-0">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Instalar aplicativo
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No <strong>Chrome/Android</strong>, toque no menu <strong>⋮</strong> e escolha{' '}
                    <strong>"Instalar app"</strong>. No <strong>Safari/iPhone</strong>, toque em{' '}
                    <strong>Compartilhar</strong> e depois em <strong>"Adicionar à Tela de Início"</strong>.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeInUp}>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis na sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">Apagar todos os dados da conta</p>
                  <p className="text-sm text-muted-foreground">
                    Remove permanentemente lançamentos, categorias, custos fixos, integrações,
                    pedidos e anúncios. Seu login e assinatura não são afetados.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (isDeletingData) return;
        setIsDeleteDialogOpen(open);
        if (!open) setDeleteConfirmText('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todos os dados da conta?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Essa ação é <strong>permanente</strong> e não pode ser desfeita. Todos os seus
                  lançamentos, categorias, custos fixos, anúncios, integrações e pedidos sincronizados
                  serão apagados. Seu login e sua assinatura continuam ativos.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm">
                    Digite <strong>APAGAR</strong> para confirmar
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="APAGAR"
                    autoComplete="off"
                    disabled={isDeletingData}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingData}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllData}
              disabled={deleteConfirmText !== 'APAGAR' || isDeletingData}
            >
              {isDeletingData ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Apagar tudo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

export default PerfilContent;
