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
import { ImageGenerationSection } from '@/components/assistente/ImageGenerationSection';
import { GeneratedImage } from '@/components/assistente/GeneratedImageGrid';
import { MedidasProdutoSection } from '@/components/assistente/MedidasProdutoSection';
import { MedidaLinha } from '@/components/assistente/medidas.types';

interface FormData {
  nomeProduto: string;
  categoria: string;
  
  faixaPreco: string;
  publicoAlvo: string;
  materiais: string;
  coresDisponiveis: string;
  // Medidas do produto (novo sistema dinâmico)
  camposMedidaSelecionados: string[];
  linhasMedidas: MedidaLinha[];
}

interface GeneratedAd {
  titles: string[];
  keywords: string[];
  description: string;
}

const categorias = [
  'Moda Feminina',
  'Moda Masculina',
  'Moda Infantil',
  'Acessórios',
  'Beleza & Cuidados',
  'Casa & Decoração',
  'Eletrônicos',
  'Esportes',
  'Brinquedos',
  'Outros',
];

const publicosAlvo = [
  'Feminino',
  'Masculino',
  'Infantil',
  'Plus Size',
  'Unissex',
  'Jovem',
  'Adulto',
  'Terceira Idade',
];

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const AssistenteAnuncio = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState<number | null>(null);
  const [copiedDescription, setCopiedDescription] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Image generation states
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    nomeProduto: '',
    categoria: '',
    faixaPreco: '',
    publicoAlvo: '',
    materiais: '',
    coresDisponiveis: '',
    camposMedidaSelecionados: [],
    linhasMedidas: [],
  });

  const [generatedAd, setGeneratedAd] = useState<GeneratedAd | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Funções para gerenciar medidas
  const toggleCampoMedida = (campoId: string) => {
    setFormData(prev => {
      const isSelected = prev.camposMedidaSelecionados.includes(campoId);
      const newCampos = isSelected
        ? prev.camposMedidaSelecionados.filter(c => c !== campoId)
        : [...prev.camposMedidaSelecionados, campoId];
      
      // Se é o primeiro campo selecionado, adiciona uma linha automaticamente
      const newLinhas = !isSelected && prev.camposMedidaSelecionados.length === 0 && prev.linhasMedidas.length === 0
        ? [{ id: `medida-${Date.now()}-${Math.random()}`, tamanho: '', valores: {} }]
        : prev.linhasMedidas;
      
      return {
        ...prev,
        camposMedidaSelecionados: newCampos,
        linhasMedidas: newLinhas,
      };
    });
  };

  const addMedidaLinha = () => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: [
        ...prev.linhasMedidas,
        { id: `medida-${Date.now()}-${Math.random()}`, tamanho: '', valores: {} }
      ]
    }));
  };

  const removeMedidaLinha = (id: string) => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: prev.linhasMedidas.filter(linha => linha.id !== id)
    }));
  };

  const updateMedidaLinha = (id: string, campo: string, valor: string) => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: prev.linhasMedidas.map(linha =>
        linha.id === id
          ? { ...linha, valores: { ...linha.valores, [campo]: valor } }
          : linha
      )
    }));
  };

  const updateTamanhoLinha = (id: string, tamanho: string) => {
    setFormData(prev => ({
      ...prev,
      linhasMedidas: prev.linhasMedidas.map(linha =>
        linha.id === id ? { ...linha, tamanho } : linha
      )
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    
    Array.from(files).forEach(file => {
      if (images.length + newFiles.length >= MAX_IMAGES) {
        toast({
          title: 'Limite atingido',
          description: `Máximo de ${MAX_IMAGES} fotos permitidas.`,
          variant: 'destructive',
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: `${file.name} excede o limite de 5MB.`,
          variant: 'destructive',
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Formato inválido',
          description: `${file.name} não é uma imagem válida.`,
          variant: 'destructive',
        });
        return;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setImages(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, preencha o nome do produto.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedAd(null);
    setGeneratedImages([]);

    try {
      // Convert images to base64
      const imageBase64Array = await Promise.all(
        images.map(img => convertToBase64(img))
      );

      // Step 1: Generate title and description
      const { data, error } = await supabase.functions.invoke('generate-ad', {
        body: {
          nomeProduto: formData.nomeProduto,
          categoria: formData.categoria,
          faixaPreco: formData.faixaPreco,
          publicoAlvo: formData.publicoAlvo,
          materiais: formData.materiais,
          coresDisponiveis: formData.coresDisponiveis,
          images: imageBase64Array,
          medidas: {
            campos: formData.camposMedidaSelecionados,
            linhas: formData.linhasMedidas.map(linha => ({
              tamanho: linha.tamanho,
              ...linha.valores
            }))
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar anúncio');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedAd({
        titles: data.titles,
        keywords: data.keywords || [],
        description: data.description,
      });

      toast({
        title: 'Título e descrição gerados!',
        description: imageBase64Array.length > 0 ? 'Agora gerando as imagens do produto...' : 'Anúncio pronto para uso.',
      });

      setIsLoading(false);

      // Step 2: Generate product images if there are source images
      if (imageBase64Array.length > 0) {
        setIsGeneratingImages(true);
        setImageProgress(10);

        try {
          const { data: imageData, error: imageError } = await supabase.functions.invoke('generate-product-images', {
            body: {
              sourceImages: imageBase64Array,
              categoria: formData.categoria,
              coresDisponiveis: formData.coresDisponiveis,
              materiais: formData.materiais,
              nomeProduto: formData.nomeProduto,
            },
          });

          setImageProgress(80);

          if (imageError) {
            throw new Error(imageError.message || 'Erro ao gerar imagens');
          }

          if (imageData?.error) {
            throw new Error(imageData.error);
          }

          if (imageData?.images && imageData.images.length > 0) {
            setGeneratedImages(imageData.images);
            setImageProgress(100);
            toast({
              title: 'Imagens geradas!',
              description: `${imageData.images.length} imagens criadas com sucesso.`,
            });
          } else {
            throw new Error('Nenhuma imagem foi gerada');
          }

          setIsGeneratingImages(false);
        } catch (imageError) {
          const errorMessage = imageError instanceof Error ? imageError.message : 'Erro desconhecido';
          toast({
            title: 'Erro ao gerar imagens',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsGeneratingImages(false);
          setImageProgress(0);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao gerar anúncio',
        description: errorMessage,
        variant: 'destructive',
      });
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
      
      toast({
        title: 'Copiado!',
        description: type === 'title' ? 'Título copiado para a área de transferência.' : 'Descrição copiada para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o texto.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Assistente de Anúncio
          </h1>
          <p className="text-muted-foreground">
            Crie títulos e descrições otimizados para seus produtos na Shopee
          </p>
        </div>

        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Produto</CardTitle>
            <CardDescription>
              Preencha os dados do produto para gerar títulos e descrições personalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome do Produto */}
              <div className="space-y-2">
                <Label htmlFor="nomeProduto">
                  Nome do Produto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nomeProduto"
                  placeholder="Ex: Vestido Longo Estampado"
                  value={formData.nomeProduto}
                  onChange={(e) => handleInputChange('nomeProduto', e.target.value)}
                />
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => handleInputChange('categoria', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

        
              {/* Faixa de Preço */}
              <div className="space-y-2">
                <Label htmlFor="faixaPreco">Faixa de Preço</Label>
                <Input
                  id="faixaPreco"
                  placeholder="Ex: 50-100"
                  value={formData.faixaPreco}
                  onChange={(e) => handleInputChange('faixaPreco', e.target.value)}
                />
              </div>

              {/* Público-alvo */}
              <div className="space-y-2">
                <Label htmlFor="publicoAlvo">Público-alvo</Label>
                <Select
                  value={formData.publicoAlvo}
                  onValueChange={(value) => handleInputChange('publicoAlvo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o público" />
                  </SelectTrigger>
                  <SelectContent>
                    {publicosAlvo.map((pub) => (
                      <SelectItem key={pub} value={pub}>
                        {pub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cores Disponíveis */}
              <div className="space-y-2">
                <Label htmlFor="coresDisponiveis">Cores Disponíveis</Label>
                <Input
                  id="coresDisponiveis"
                  placeholder="Ex: Preto, Branco, Vermelho"
                  value={formData.coresDisponiveis}
                  onChange={(e) => handleInputChange('coresDisponiveis', e.target.value)}
                />
              </div>
            </div>

            {/* Materiais */}
            <div className="space-y-2">
              <Label htmlFor="materiais">Materiais/Tecidos</Label>
              <Textarea
                id="materiais"
                placeholder="Ex: Algodão 100%, Poliéster, Viscose, Suplex..."
                value={formData.materiais}
                onChange={(e) => handleInputChange('materiais', e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                O tecido será usado para gerar instruções de lavagem personalizadas
              </p>
            </div>

            {/* Seção de Medidas */}
            <MedidasProdutoSection
              camposSelecionados={formData.camposMedidaSelecionados}
              linhasMedidas={formData.linhasMedidas}
              onToggleCampo={toggleCampoMedida}
              onAddLinha={addMedidaLinha}
              onRemoveLinha={removeMedidaLinha}
              onUpdateLinha={updateMedidaLinha}
              onUpdateTamanho={updateTamanhoLinha}
            />

            {/* Upload de Fotos */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                Fotos do Produto <span className="text-muted-foreground font-normal">(opcional - até {MAX_IMAGES} fotos)</span>
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              
              <div
                onClick={() => images.length < MAX_IMAGES && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  images.length < MAX_IMAGES 
                    ? 'cursor-pointer hover:border-primary hover:bg-muted/50' 
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {images.length < MAX_IMAGES 
                    ? 'Clique para selecionar ou arraste imagens aqui'
                    : 'Limite de fotos atingido'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG ou WEBP (máx. 5MB cada)
                </p>
              </div>

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Foto ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <span className="self-center text-sm text-muted-foreground">
                    {images.length} de {MAX_IMAGES} fotos
                  </span>
                </div>
              )}
            </div>

            {/* Botão Gerar */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || isGeneratingImages}
              className="w-full md:w-auto"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando título e descrição...
                </>
              ) : isGeneratingImages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando imagens...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {images.length > 0 ? 'Gerar Título, Descrição e Imagens' : 'Gerar título e descrição'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Gerador de Imagens do Produto */}
        <ImageGenerationSection 
          formData={formData}
          imagePreviews={imagePreviews}
          isGenerating={isGeneratingImages}
          progress={imageProgress}
          generatedImages={generatedImages}
        />

        {/* Resultados */}
        {generatedAd && (
          <div className="space-y-6">
            {/* Keywords Identificadas */}
            {generatedAd.keywords && generatedAd.keywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Palavras-chave Identificadas
                  </CardTitle>
                  <CardDescription>
                    Termos mais buscados para este tipo de produto na Shopee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {generatedAd.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Títulos Sugeridos */}
            <Card>
              <CardHeader>
                <CardTitle>Títulos Sugeridos</CardTitle>
                <CardDescription>
                  Clique em "Copiar" para usar o título no seu anúncio (máx. 100 caracteres)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {generatedAd.titles.map((title, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm mb-1">{title}</p>
                      <p className="text-xs text-muted-foreground mb-2">{title.length} caracteres</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(title, 'title', index)}
                        className="w-full"
                      >
                        {copiedTitle === index ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-3 w-3" />
                            Copiar título
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Descrição Gerada */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição Gerada</CardTitle>
                <CardDescription>
                  Descrição completa e otimizada para seu produto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={generatedAd.description}
                  readOnly
                  rows={15}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(generatedAd.description, 'description')}
                  className="w-full md:w-auto"
                >
                  {copiedDescription ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar descrição
                    </>
                  )}
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
