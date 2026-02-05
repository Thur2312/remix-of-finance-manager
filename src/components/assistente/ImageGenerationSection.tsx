import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

export interface GeneratedImage {
  url: string;
  prompt?: string;
  composition?: string;
}

interface ImageGenerationSectionProps {
  formData: {
    nomeProduto: string;
    categoria: string;
    coresDisponiveis: string;
    materiais: string;
  };
  imagePreviews: string[];
  isGenerating: boolean;
  progress: number;
  generatedImages: GeneratedImage[];
}

export const ImageGenerationSection = ({
  isGenerating,
  progress,
  generatedImages,
}: ImageGenerationSectionProps) => {
  if (!isGenerating && generatedImages.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
          Imagens Geradas por IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Gerando imagens...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {generatedImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {generatedImages.map((image, index) => (
              <div key={index} className="relative group space-y-1">
                <img
                  src={image.url}
                  alt={`Imagem gerada ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border"
                />
                {image.composition && (
                  <p className="text-xs text-muted-foreground text-center">{image.composition}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
