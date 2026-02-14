import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { MedidaLinha, medidasDisponiveis } from './medidas.types';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface MedidasProdutoSectionProps {
  camposSelecionados: string[];
  linhasMedidas: MedidaLinha[];
  onToggleCampo: (campo: string) => void;
  onAddLinha: () => void;
  onRemoveLinha: (id: string) => void;
  onUpdateLinha: (id: string, campo: string, valor: string) => void;
  onUpdateTamanho: (id: string, tamanho: string) => void;
  medidasPersonalizadas: { id: string; nome: string; unidade: string }[];
  onAddMedidaPersonalizada: (nome: string, unidade: string) => void;
}

export const MedidasProdutoSection = ({
  camposSelecionados,
  linhasMedidas,
  onToggleCampo,
  onAddLinha,
  onRemoveLinha,
  onUpdateLinha,
  onUpdateTamanho,
  medidasPersonalizadas,
  onAddMedidaPersonalizada,
}: MedidasProdutoSectionProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [novaMedidaNome, setNovaMedidaNome] = useState('');
  const [novaMedidaUnidade, setNovaMedidaUnidade] = useState('');

  const handleAddMedidaPersonalizada = () => {
    console.log('Tentando adicionar medida:', novaMedidaNome, novaMedidaUnidade);  // Log para debug
    if (!novaMedidaNome.trim() || !novaMedidaUnidade.trim()) {
      console.log('Campos obrigatórios não preenchidos');  // Log para debug
      return;
    }
    console.log('Chamando onAddMedidaPersonalizada');  // Log para debug
    onAddMedidaPersonalizada(novaMedidaNome.trim(), novaMedidaUnidade.trim());
    setNovaMedidaNome('');
    setNovaMedidaUnidade('');
    setIsDialogOpen(false);
  };

  // Combinar medidas padrão com personalizadas
  const todasMedidas = [
    ...medidasDisponiveis.map(medida => ({ id: medida, nome: medida, unidade: 'cm' })),
    ...medidasPersonalizadas,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border border-blue-200 shadow-lg bg-white">
        <CardHeader className="bg-blue-50 border-b border-blue-200 flex flex-row items-center justify-between">
          <CardTitle className="text-gray-900">Tabela de Medidas (Opcional)</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Medida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Medida Personalizada</DialogTitle>
                <DialogDescription>
                  Crie uma nova medida para o seu produto.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nomeMedida">Nome da Medida</Label>
                  <Input
                    id="nomeMedida"
                    placeholder="Ex: Diâmetro, Volume"
                    value={novaMedidaNome}
                    onChange={(e) => setNovaMedidaNome(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="unidadeMedida">Unidade</Label>
                  <Select value={novaMedidaUnidade} onValueChange={setNovaMedidaUnidade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddMedidaPersonalizada} className="w-full">
                  Adicionar Medida
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
              {todasMedidas.map((medida, index) => (
                <motion.div 
                  key={medida.id} 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.05 }}
                >
                  <Checkbox
                    id={`medida-${medida.id}`}
                    checked={camposSelecionados.includes(medida.id)}
                    onCheckedChange={() => onToggleCampo(medida.id)}
                    className="border-blue-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <Label
                    htmlFor={`medida-${medida.id}`}
                    className="text-sm font-normal cursor-pointer text-gray-900"
                  >
                    {medida.nome} ({medida.unidade})
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
                      {camposSelecionados.map((medidaId) => {
                        const medida = todasMedidas.find(m => m.id === medidaId);
                        return (
                          <th key={medidaId} className="text-left p-3 font-semibold text-gray-900">
                            {medida?.nome} ({medida?.unidade})
                          </th>
                        );
                      })}
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
                        {camposSelecionados.map((medidaId) => (
                          <td key={medidaId} className="p-3">
                            <Input
                              type="number"
                              value={linha.valores[medidaId] || ''}
                              onChange={(e) =>
                                onUpdateLinha(linha.id, medidaId, e.target.value)
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