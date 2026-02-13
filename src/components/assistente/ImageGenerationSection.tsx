import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border border-blue-200 shadow-lg bg-white">
        <CardHeader className="bg-blue-50 border-b border-blue-200">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            Imagens Geradas por IA
          </CardTitle>
        </CardHeader>
        <br />
        <CardContent className="space-y-4">
          {isGenerating && (
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex justify-between text-sm text-gray-600">
                <span>Gerando imagens...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </motion.div>
          )}

          {generatedImages.length > 0 && (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {generatedImages.map((image, index) => (
                <motion.div 
                  key={index} 
                  className="relative group space-y-1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <img
                    src={image.url}
                    alt={`Imagem gerada ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                  />
                  {image.composition && (
                    <p className="text-xs text-gray-600 text-center">{image.composition}</p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};