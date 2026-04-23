import { useState, useRef } from 'react';
import { Sparkles, Copy, Check, Loader2, ImagePlus, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';
import { MedidasProdutoSection } from '@/components/assistente/MedidasProdutoSection';

interface MedidaLinha {
  id: string;
  tamanho: string;
  valores: Record<string, string>;
}

interface FormData {
  nomeProduto: string;
  categoria: string;
  marca: string;
  faixaPreco: string;
  publicoAlvo: string;
  materiais: string;
  coresDisponiveis: string;
  camposMedidaSelecionados: string[];
  linhasMedidas: MedidaLinha[];
  medidasPersonalizadas: { id: string; nome: string; unidade: string; }[];
}

interface GeneratedAd {
  titles: string[];
  keywords: string[];
  description: string;
}

interface GeneratedAd {
  titles: string[];
  keywords: string[];
  description: string;
  generatedImages: string[];
}

const categorias = [
  'Moda Feminina', 'Moda Masculina', 'Moda Infantil', 'Acessórios',
  'Beleza & Cuidados', 'Casa & Decoração', 'Eletrônicos', 'Esportes',
  'Brinquedos', 'Outros',
];

const publicosAlvo = [
  'Feminino', 'Masculino', 'Infantil', 'Plus Size',
  'Unissex', 'Jovem', 'Adulto', 'Terceira Idade',
];

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const AssistenteAnuncio = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState<number | null>(null);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedAd, setGeneratedAd] = useState<GeneratedAd | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nomeProduto: '',
    categoria: '',
    marca: '',
    faixaPreco: '',
    publicoAlvo: '',
    materiais: '',
    coresDisponiveis: '',
    camposMedidaSelecionados: [],
    linhasMedidas: [],
    medidasPersonalizadas: [],
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCampoMedida = (campoId: string) => {
    setFormData(prev => {
      const isSelected = prev.camposMedidaSelecionados.includes(campoId);
      const newCampos = isSelected
        ? prev.camposMedidaSelecionados.filter(c => c !== campoId)
        : [...prev.camposMedidaSelecionados, campoId];
      const newLinhas = !isSelected && prev.camposMedidaSelecionados.length === 0 && prev.linhasMedidas.length === 0
        ? [{ id: crypto.randomUUID(), tamanho: '', valores: {} }]
        : prev.linhasMedidas;
      return { ...prev, camposMedidaSelecionados: newCampos, linhasMedidas: newLinhas };
    });
  };

  const addMedidaLinha = () => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: [...prev.linhasMedidas, { id: crypto.randomUUID(), tamanho: '', valores: {} }]
    }));
  };

  const removeMedidaLinha = (id: string) => {
    setFormData(prev => ({ ...prev, linhasMedidas: prev.linhasMedidas.filter(l => l.id !== id) }));
  };

  const updateMedidaLinha = (id: string, campo: string, valor: string) => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: prev.linhasMedidas.map(l =>
        l.id === id ? { ...l, valores: { ...l.valores, [campo]: valor } } : l
      )
    }));
  };

  const updateTamanhoLinha = (id: string, tamanho: string) => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: prev.linhasMedidas.map(l => l.id === id ? { ...l, tamanho } : l)
    }));
  };

  const addMedidaPersonalizada = (medida: string, unidade: string = '') => {
    setFormData(prev => ({
      ...prev,
      medidasPersonalizadas: [...prev.medidasPersonalizadas, { id: crypto.randomUUID(), nome: medida, unidade }]
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    Array.from(files).forEach(file => {
      if (images.length + newFiles.length >= MAX_IMAGES) {
        toast({ title: 'Limite atingido', description: `Máximo de ${MAX_IMAGES} fotos.`, variant: 'destructive' });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede 5MB.`, variant: 'destructive' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Formato inválido', description: `${file.name} não é uma imagem válida.`, variant: 'destructive' });
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });
    setImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!formData.nomeProduto.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Preencha o nome do produto.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setGeneratedAd(null);

    try {
      const imageBase64Array = await Promise.all(images.map(img => convertToBase64(img)));

      const { data, error } = await supabase.functions.invoke('generate-ad', {
        body: {
          nomeProduto: formData.nomeProduto,
          categoria: formData.categoria,
          marca: formData.marca,
          faixaPreco: formData.faixaPreco,
          publicoAlvo: formData.publicoAlvo,
          materiais: formData.materiais,
          coresDisponiveis: formData.coresDisponiveis,
          images: imageBase64Array,
          medidas: {
            campos: formData.camposMedidaSelecionados,
            linhas: formData.linhasMedidas.map(l => ({ tamanho: l.tamanho, ...l.valores }))
          },
        },
      });

      if (error) throw new Error(error.message || 'Erro ao gerar anúncio');
      if (data?.error) throw new Error(data.error);

      setGeneratedAd({
      titles: data.titles,
      keywords: data.keywords || [],
      description: data.description,
      generatedImages: data.generatedImages || [],
    });

      toast({ title: 'Anúncio gerado com sucesso!', description: 'Título e descrição prontos para usar.' });

    } catch (error) {
      toast({
        title: 'Erro ao gerar anúncio',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'title' | 'description', index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'title' && index !== undefined) {
        setCopiedTitle(index);
        setTimeout(() => setCopiedTitle(null), 2000);
      } else {
        setCopiedDescription(true);
        setTimeout(() => setCopiedDescription(false), 2000);
      }
      toast({ title: 'Copiado!' });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Assistente de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Crie títulos e descrições otimizados para seus produtos na Shopee
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>Preencha os dados do produto para gerar títulos e descrições personalizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeProduto">Nome do Produto <span className="text-destructive">*</span></Label>
                <Input id="nomeProduto" placeholder="Ex: Vestido Longo Estampado" value={formData.nomeProduto} onChange={(e) => handleInputChange('nomeProduto', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => handleInputChange('categoria', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                  <SelectContent>{categorias.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" placeholder="Ex: Nike, Adidas" value={formData.marca} onChange={(e) => handleInputChange('marca', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faixaPreco">Faixa de Preço</Label>
                <Input id="faixaPreco" placeholder="Ex: 50-100" value={formData.faixaPreco} onChange={(e) => handleInputChange('faixaPreco', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Público-alvo</Label>
                <Select value={formData.publicoAlvo} onValueChange={(v) => handleInputChange('publicoAlvo', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o público" /></SelectTrigger>
                  <SelectContent>{publicosAlvo.map(pub => <SelectItem key={pub} value={pub}>{pub}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coresDisponiveis">Cores Disponíveis</Label>
                <Input id="coresDisponiveis" placeholder="Ex: Preto, Branco, Vermelho" value={formData.coresDisponiveis} onChange={(e) => handleInputChange('coresDisponiveis', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materiais">Materiais/Tecidos</Label>
              <Textarea id="materiais" placeholder="Ex: Algodão 100%, Poliéster..." value={formData.materiais} onChange={(e) => handleInputChange('materiais', e.target.value)} rows={2} />
              <p className="text-xs text-muted-foreground">O tecido será usado para gerar instruções de lavagem personalizadas</p>
            </div>

            <MedidasProdutoSection
              camposSelecionados={formData.camposMedidaSelecionados}
              linhasMedidas={formData.linhasMedidas}
              medidasPersonalizadas={formData.medidasPersonalizadas}
              onToggleCampo={toggleCampoMedida}
              onAddLinha={addMedidaLinha}
              onRemoveLinha={removeMedidaLinha}
              onUpdateLinha={updateMedidaLinha}
              onUpdateTamanho={updateTamanhoLinha}
              onAddMedidaPersonalizada={addMedidaPersonalizada}
            />

            {/* Upload de Fotos para análise visual */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Fotos do Produto <span className="text-muted-foreground font-normal">(opcional - até {MAX_IMAGES} fotos para análise)</span>
              </Label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelect} className="hidden" />
              <div
                onClick={() => images.length < MAX_IMAGES && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${images.length < MAX_IMAGES ? 'cursor-pointer hover:border-primary hover:bg-muted/50' : 'cursor-not-allowed opacity-50'}`}
              >
                <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{images.length < MAX_IMAGES ? 'Clique para selecionar ou arraste imagens aqui' : 'Limite de fotos atingido'}</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou WEBP (máx. 5MB cada)</p>
              </div>
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Foto ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <span className="self-center text-sm text-muted-foreground">{images.length} de {MAX_IMAGES} fotos</span>
                </div>
              )}
            </div>

            <Button onClick={handleGenerate} disabled={isLoading} className="w-full md:w-auto" size="lg">
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando anúncio...</>
                : <><Sparkles className="mr-2 h-4 w-4" />Gerar com anúncio com IA</>
              }
            </Button>
          </CardContent>
        </Card>



        {generatedAd && (
          <div className="space-y-6">
            {generatedAd.keywords && generatedAd.keywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Palavras-chave Identificadas</CardTitle>
                  <CardDescription>Termos mais buscados para este tipo de produto na Shopee</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {generatedAd.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">{keyword}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Títulos Sugeridos</CardTitle>
                <CardDescription>Clique em "Copiar" para usar o título no seu anúncio (máx. 100 caracteres)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {generatedAd.titles.map((title, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <p className="text-sm mb-1">{title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{title.length} caracteres</p>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(title, 'title', index)} className="w-full">
                        {copiedTitle === index ? <><Check className="mr-1 h-3 w-3" />Copiado!</> : <><Copy className="mr-1 h-3 w-3" />Copiar título</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descrição Gerada</CardTitle>
                <CardDescription>Descrição completa e otimizada para seu produto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={generatedAd.description} readOnly rows={15} className="font-mono text-sm" />
                <Button variant="outline" onClick={() => copyToClipboard(generatedAd.description, 'description')} className="w-full md:w-auto">
                  {copiedDescription ? <><Check className="mr-2 h-4 w-4" />Copiado!</> : <><Copy className="mr-2 h-4 w-4" />Copiar descrição</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default function AssistenteAnuncioPage() {
  return (
    <ProtectedRoute>
      <AssistenteAnuncio />
    </ProtectedRoute>
  );
}