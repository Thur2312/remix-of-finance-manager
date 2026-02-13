import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { MedidaLinha, medidasDisponiveis } from './medidas.types';
import { motion } from 'framer-motion';

interface MedidasProdutoSectionProps {
  camposSelecionados: string[];
  linhasMedidas: MedidaLinha[];
  onToggleCampo: (campo: string) => void;
  onAddLinha: () => void;
  onRemoveLinha: (id: string) => void;
  onUpdateLinha: (id: string, campo: string, valor: string) => void;
  onUpdateTamanho: (id: string, tamanho: string) => void;
}

export const MedidasProdutoSection = ({
  camposSelecionados,
  linhasMedidas,
  onToggleCampo,
  onAddLinha,
  onRemoveLinha,
  onUpdateLinha,
  onUpdateTamanho,
}: MedidasProdutoSectionProps) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border border-blue-200 shadow-lg bg-white">
        <CardHeader className="bg-blue-50 border-b border-blue-200">
          <CardTitle className="text-gray-900">Tabela de Medidas (Opcional)</CardTitle>
        </CardHeader>
        <br />
        <CardContent className="space-y-4">
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Label className="text-gray-900">Selecione as medidas que deseja incluir:</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {medidasDisponiveis.map((medida, index) => (
                <motion.div 
                  key={medida} 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                >
                  <Checkbox
                    id={`medida-${medida}`}
                    checked={camposSelecionados.includes(medida)}
                    onCheckedChange={() => onToggleCampo(medida)}
                    className="border-blue-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label
                    htmlFor={`medida-${medida}`}
                    className="text-sm font-normal cursor-pointer text-gray-900"
                  >
                    {medida}
                  </Label>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {camposSelecionados.length > 0 && (
            <>
              <motion.div 
                className="overflow-x-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <table className="w-full border-collapse border border-blue-200 rounded-lg overflow-hidden">
                  <thead>
                    <motion.tr 
                      className="border-b border-blue-200 bg-blue-50"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <th className="text-left p-3 font-semibold text-gray-900">Tamanho</th>
                      {camposSelecionados.map((medida) => (
                        <th key={medida} className="text-left p-3 font-semibold text-gray-900">
                          {medida} (cm)
                        </th>
                      ))}
                      <th className="w-10"></th>
                    </motion.tr>
                  </thead>
                  <tbody>
                    {linhasMedidas.map((linha, index) => (
                      <motion.tr 
                        key={linha.id} 
                        className="border-b border-blue-200 hover:bg-blue-25 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                      >
                        <td className="p-3">
                          <Input
                            value={linha.tamanho}
                            onChange={(e) =>
                              onUpdateTamanho(linha.id, e.target.value)
                            }
                            placeholder="Ex: P, M, G"
                            className="w-24 border-blue-200 focus:border-blue-500"
                          />
                        </td>
                        {camposSelecionados.map((medida) => (
                          <td key={medida} className="p-3">
                            <Input
                              type="number"
                              value={linha.valores[medida] || ''}
                              onChange={(e) =>
                                onUpdateLinha(linha.id, medida, e.target.value)
                              }
                              placeholder="--"
                              className="w-20 border-blue-200 focus:border-blue-500"
                            />
                          </td>
                        ))}
                        <td className="p-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveLinha(linha.id)}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={onAddLinha}
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tamanho
                </Button>
              </motion.div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};