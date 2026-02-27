import { useState } from 'react';
import { Download, ZoomIn, X, Palette, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface GeneratedImage {
  id: number;
  type: string;
  color: string | null;
  imageUrl: string;
  label: string;
}

interface GeneratedImageGridProps {
  images: GeneratedImage[];
  productName: string;
}

export function GeneratedImageGrid({ images, productName }: GeneratedImageGridProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadImage = async (image: GeneratedImage) => {
    try {
      // Extract base64 data
      const base64Data = image.imageUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid image data');
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename
      const sanitizedProductName = productName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const colorPart = image.color ? `_${image.color.toLowerCase().replace(/\s+/g, '_')}` : '';
      const typePart = image.type.toLowerCase().replace(/\s+/g, '_');
      link.download = `${sanitizedProductName}${colorPart}_${typePart}.png`;
      
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download iniciado',
        description: `${image.label} baixada com sucesso.`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar a imagem.',
        variant: 'destructive',
      });
    }
  };

  const downloadAllImages = async () => {
    setIsDownloading(true);
    
    try {
      for (let i = 0; i < images.length; i++) {
        await downloadImage(images[i]);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      toast({
        title: 'Downloads concluídos',
        description: `${images.length} imagens baixadas com sucesso.`,
      });
    } catch (error) {
      console.error('Error downloading images:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Imagens Geradas ({images.length})
        </h3>
        <Button
          variant="outline"
          onClick={downloadAllImages}
          disabled={isDownloading}
        >
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Baixando...' : 'Baixar Todas'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative bg-muted/30 rounded-lg overflow-hidden border hover:border-primary transition-colors"
          >
            <div className="aspect-square relative">
              <img
                src={image.imageUrl}
                alt={image.label}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setSelectedImage(image)}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => downloadImage(image)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="p-2 space-y-1">
              <div className="flex flex-wrap gap-1">
                {image.type === 'tabela_medidas' ? (
                  <Badge variant="default" className="text-xs">
                    <Ruler className="mr-1 h-3 w-3" />
                    Tabela
                  </Badge>
                ) : (
                  <>
                    {image.color && (
                      <Badge variant="secondary" className="text-xs">
                        <Palette className="mr-1 h-3 w-3" />
                        {image.color}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {image.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Image preview modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {selectedImage?.label || 'Visualizar imagem'}
          </DialogTitle>
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.label}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadImage(selectedImage)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 flex gap-2">
                {selectedImage.type === 'tabela_medidas' ? (
                  <Badge variant="default">
                    <Ruler className="mr-1 h-3 w-3" />
                    Tabela de Medidas
                  </Badge>
                ) : (
                  <>
                    {selectedImage.color && (
                      <Badge variant="secondary">
                        <Palette className="mr-1 h-3 w-3" />
                        {selectedImage.color}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-background/80">
                      {selectedImage.label}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
