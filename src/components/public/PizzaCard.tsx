import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Lock, Check } from 'lucide-react';
import { PizzaFlavor, PizzaSize, PizzaBorder } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PizzaCardProps {
  flavor: PizzaFlavor;
}

export const PizzaCard: React.FC<PizzaCardProps> = ({ flavor }) => {
  const { settings, borders, flavors } = useStore();
  const { addPizza } = useCart();

  const openNow = settings.isOpen;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('M');
  const [flavorCount, setFlavorCount] = useState<1 | 2>(1);
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([flavor]);

  // Estados para borda (agora suporta múltiplos sabores)
  const [hasBorder, setHasBorder] = useState(false);
  const [withBorders, setWithBorders] = useState<PizzaBorder[]>([]);
  
  // Estado para observação
  const [observation, setObservation] = useState('');

  /* Agrupar sabores por categoria */
  const groupedFlavors = useMemo(() => {
    const groups: Record<string, PizzaFlavor[]> = {};
    flavors.forEach(f => {
      const category = f.categoryName || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(f);
    });
    return groups;
  }, [flavors]);

  // Garantir que ao voltar para 1 sabor, volte para o sabor inicial
  useEffect(() => {
    if (flavorCount === 1) {
      setSelectedFlavors([flavor]);
    }
  }, [flavorCount, flavor]);

  const handleOpenModal = () => {
    if (!openNow) {
      toast.error('Pedidos apenas no horário de funcionamento.');
      return;
    }

    setSelectedSize('M');
    setFlavorCount(1);
    setSelectedFlavors([flavor]);
    setHasBorder(false);
    setWithBorders([]);
    setObservation('');
    setIsOpen(true);
  };

  const toggleFlavor = (f: PizzaFlavor) => {
    const exists = selectedFlavors.some(s => s.id === f.id);

    if (exists) {
      // Se for o único sabor e tentar remover, não permite
      if (selectedFlavors.length === 1) return;

      // Remove o sabor
      setSelectedFlavors(prev => prev.filter(s => s.id !== f.id));
    } else {
      // Se já tem 2 sabores, não permite adicionar mais
      if (selectedFlavors.length >= flavorCount) return;

      // Adiciona o novo sabor
      setSelectedFlavors(prev => [...prev, f]);
    }
  };

  const calculateBorderTotal = () => {
    return withBorders.reduce((sum, border) => {
      return sum + (border.prices?.[selectedSize] || border.price || 0);
    }, 0);
  };

  const calculatePrice = () => {
    let flavorPrice = 0;

    if (selectedFlavors.length === 1) {
      flavorPrice = selectedFlavors[0].prices[selectedSize];
    }

    if (selectedFlavors.length === 2) {
      flavorPrice =
        selectedFlavors[0].prices[selectedSize] / 2 +
        selectedFlavors[1].prices[selectedSize] / 2;
    }

    const borderPrice = calculateBorderTotal();

    return flavorPrice + borderPrice;
  };

  const isInvalidTwoFlavors =
    flavorCount === 2 && selectedFlavors.length < 2;

  // Validação: se marcou "Com borda" mas não selecionou nenhuma
  const isBorderInvalid = hasBorder && withBorders.length === 0;

  return (
    <>
      {/* CARD DO MENU */}
      <motion.div whileHover={{ y: openNow ? -4 : 0 }}>
        <Card
          onClick={handleOpenModal}
          className={`overflow-hidden ${
            openNow ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="relative aspect-square">
            <img
              src={flavor.image}
              alt={flavor.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
              <h3 className="text-white font-bold text-lg">{flavor.name}</h3>
              <p className="text-white/80 text-xs line-clamp-2">
                {flavor.ingredients.join(', ')}
              </p>
            </div>

            {!openNow && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Lock className="text-white w-6 h-6" />
              </div>
            )}

            <Badge className="absolute top-3 right-3">
              A partir de R$ {flavor.prices.P.toFixed(2)}
            </Badge>
          </div>

          <CardContent>
            <Button className="w-full mt-3" disabled={!openNow}>
              <Plus className="w-4 h-4 mr-2" />
              Escolher pizza
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Monte sua pizza 🍕
            </DialogTitle>
          </DialogHeader>

          {/* TAMANHO */}
          <section className="space-y-3">
            <h4 className="font-semibold">Tamanho</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map(size => {
                // Calcular o preço para este tamanho baseado nos sabores selecionados
                let priceForSize = 0;

                if (selectedFlavors.length === 1) {
                  priceForSize = selectedFlavors[0].prices[size];
                } else if (selectedFlavors.length === 2) {
                  priceForSize =
                    selectedFlavors[0].prices[size] / 2 +
                    selectedFlavors[1].prices[size] / 2;
                }

                return (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-xl border p-3 text-center transition ${selectedSize === size
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-primary/50'
                      }`}
                  >
                    <strong>{size}</strong>
                    <p className="text-sm">
                      R$ {priceForSize.toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SABORES */}
          <section className="space-y-3">
            <h4 className="font-semibold">Sabores</h4>

            <div className="flex gap-3">
              {[1, 2].map(v => (
                <button
                  key={v}
                  onClick={() => {
                    setFlavorCount(v as 1 | 2);
                    setSelectedFlavors([flavor]);
                  }}
                  className={`px-4 py-2 rounded-full border ${
                    flavorCount === v
                      ? 'bg-primary text-white'
                      : 'hover:border-primary'
                  }`}
                >
                  {v} sabor{v === 2 && 'es'}
                </button>
              ))}
            </div>

            {flavorCount === 2 &&
              Object.entries(groupedFlavors).map(([cat, items]) => (
                <div key={cat}>
                  <h5 className="font-medium mt-4 mb-2">{cat}</h5>
                  <div className="grid gap-2">
                    {items.map(f => {
                      const selected = selectedFlavors.some(s => s.id === f.id);
                      return (
                        <button
                          key={f.id}
                          onClick={() => toggleFlavor(f)}
                          className={`flex justify-between p-3 rounded-lg border ${
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          <span>{f.name}</span>
                          {selected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </section>

          {/* BORDA - AGORA COM MÚLTIPLOS SABORES */}
          <section className="space-y-3">
            <h4 className="font-semibold">Borda recheada</h4>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setHasBorder(false);
                  setWithBorders([]);
                }}
                className={`px-4 py-2 rounded-full border ${
                  !hasBorder ? 'bg-primary text-white' : ''
                }`}
              >
                Sem borda
              </button>

              <button
                onClick={() => {
                  if (!hasBorder && borders.length > 0) {
                    setHasBorder(true);
                    // Se não tem nenhuma borda selecionada, seleciona a primeira automaticamente
                    if (withBorders.length === 0 && borders.length > 0) {
                      setWithBorders([borders[0]]);
                    }
                  }
                }}
                className={`px-4 py-2 rounded-full border ${
                  hasBorder ? 'bg-primary text-white' : ''
                }`}
              >
                Com borda
              </button>
            </div>

            {hasBorder && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Selecione até 2 sabores de borda:
                </p>
                <div className="grid gap-2">
                  {borders.map(border => {
                    const selected = withBorders.some(b => b.id === border.id);
                    const disabled = withBorders.length >= 2 && !selected;
                    
                    return (
                      <button
                        key={border.id}
                        onClick={() => {
                          if (selected) {
                            // Remove se já estiver selecionado
                            setWithBorders(prev => prev.filter(b => b.id !== border.id));
                          } else if (withBorders.length < 2) {
                            // Adiciona se tiver menos de 2
                            setWithBorders(prev => [...prev, border]);
                          }
                        }}
                        disabled={disabled}
                        className={`w-full flex justify-between p-3 rounded-lg border transition ${
                          selected
                            ? 'border-primary bg-primary/10'
                            : disabled
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:border-primary/50'
                        }`}
                      >
                        <span>{border.name}</span>
                        <span>
                          + R$ {border.prices?.[selectedSize]?.toFixed(2) || border.price?.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                {/* Mostrar total da borda */}
                {withBorders.length > 0 && (
                  <p className="text-sm text-right text-primary font-medium mt-2">
                    Total borda: + R$ {calculateBorderTotal().toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Observação */}
          <section className="space-y-2">
            <h4 className="font-semibold">Observação (opcional)</h4>
            <textarea
              placeholder="Ex: tirar cebola, bem passada, etc..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
          </section>

          {/* RESUMO */}
          <section className="sticky bottom-0 bg-background border-t pt-4 mt-6">
            {(isInvalidTwoFlavors || isBorderInvalid) && (
              <p className="text-sm text-red-500 mb-2">
                {isInvalidTwoFlavors
                  ? 'Escolha mais 1 sabor'
                  : 'Escolha pelo menos 1 sabor de borda'}
              </p>
            )}

            <div className="flex justify-between items-center">
              <strong className="text-2xl">
                R$ {calculatePrice().toFixed(2)}
              </strong>

              <Button
                size="lg"
                disabled={isInvalidTwoFlavors || isBorderInvalid}
                onClick={() => {
                  addPizza(
                    selectedSize, 
                    selectedFlavors, 
                    withBorders.length > 0 ? withBorders[0] : undefined, 
                    observation
                  );
                  toast.success('Pizza adicionada 🍕');
                  setIsOpen(false);
                }}
              >
                Adicionar
              </Button>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
};