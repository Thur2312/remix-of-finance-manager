import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { MedidaLinha, medidasDisponiveis } from './medidas.types';

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
    <Card>
      <CardHeader>
        <CardTitle>Tabela de Medidas (Opcional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Selecione as medidas que deseja incluir:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {medidasDisponiveis.map((medida) => (
              <div key={medida} className="flex items-center space-x-2">
                <Checkbox
                  id={`medida-${medida}`}
                  checked={camposSelecionados.includes(medida)}
                  onCheckedChange={() => onToggleCampo(medida)}
                />
                <Label
                  htmlFor={`medida-${medida}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {medida}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {camposSelecionados.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tamanho</th>
                    {camposSelecionados.map((medida) => (
                      <th key={medida} className="text-left p-2">
                        {medida} (cm)
                      </th>
                    ))}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhasMedidas.map((linha) => (
                    <tr key={linha.id} className="border-b">
                      <td className="p-2">
                        <Input
                          value={linha.tamanho}
                          onChange={(e) =>
                            onUpdateTamanho(linha.id, e.target.value)
                          }
                          placeholder="Ex: P, M, G"
                          className="w-24"
                        />
                      </td>
                      {camposSelecionados.map((medida) => (
                        <td key={medida} className="p-2">
                          <Input
                            type="number"
                            value={linha.valores[medida] || ''}
                            onChange={(e) =>
                              onUpdateLinha(linha.id, medida, e.target.value)
                            }
                            placeholder="--"
                            className="w-20"
                          />
                        </td>
                      ))}
                      <td className="p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveLinha(linha.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onAddLinha}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tamanho
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
