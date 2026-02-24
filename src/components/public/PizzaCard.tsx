import React, { useState, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([
    flavor,
  ]);
  const [selectedBorder, setSelectedBorder] = useState<PizzaBorder | undefined>();

  /* =======================
     AGRUPAR SABORES
  ======================= */
  const groupedFlavors = useMemo(() => {
    const groups: Record<string, PizzaFlavor[]> = {};
    flavors.forEach(f => {
      const category = f.categoryName || 'Outros';
      if (!groups[category]) groups[category] = [];
      groups[category].push(f);
    });
    return groups;
  }, [flavors]);

  const handleOpenModal = () => {
    if (!openNow) {
      toast.error('Pedidos apenas no horário de funcionamento.');
      return;
    }
    setSelectedSize('M');
    setFlavorCount(1);
    setSelectedFlavors([flavor]);
    setSelectedBorder(undefined);
    setIsOpen(true);
  };

  const toggleFlavor = (f: PizzaFlavor) => {
    const exists = selectedFlavors.some(s => s.id === f.id);

    if (exists) {
      if (selectedFlavors.length === 1) return;
      setSelectedFlavors(prev => prev.filter(s => s.id !== f.id));
    } else {
      if (selectedFlavors.length >= 2) return;
      setSelectedFlavors(prev => [...prev, f]);
    }
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

    const borderPrice = selectedBorder
      ? selectedBorder.prices?.[selectedSize] ?? selectedBorder.price
      : 0;

    return flavorPrice + borderPrice;
  };

  const sizeLabels: Record<PizzaSize, string> = {
    P: 'Pequena',
    M: 'Média',
    G: 'Grande',
    GG: 'Gigante',
  };

  const isInvalidTwoFlavors =
    flavorCount === 2 && selectedFlavors.length < 2;

  return (
    <>
      {/* CARD */}
      <motion.div whileHover={{ y: openNow ? -4 : 0 }}>
        <Card
          onClick={handleOpenModal}
          className={`group overflow-hidden ${
            openNow ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'
          }`}
        >
          <div className="relative aspect-square">
            {/* VISUAL MEIO A MEIO */}
            {selectedFlavors.length === 2 ? (
              <div className="flex h-full">
                <img
                  src={selectedFlavors[0].image}
                  className="w-1/2 h-full object-cover"
                />
                <img
                  src={selectedFlavors[1].image}
                  className="w-1/2 h-full object-cover"
                />
              </div>
            ) : (
              <img
                src={flavor.image}
                alt={flavor.name}
                className="w-full h-full object-cover"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white font-bold text-xl">
                {flavor.name}
              </h3>
              <p className="text-white/90 text-sm line-clamp-1">
                {flavor.description}
              </p>
            </div>

            {!openNow && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Lock className="text-white w-6 h-6" />
              </div>
            )}

            <Badge className="absolute top-4 right-4">
              A partir de R$ {flavor.prices.P.toFixed(2)}
            </Badge>
          </div>

          <CardContent>
            <Button className="w-full mt-4" disabled={!openNow}>
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
          <div>
            <h4 className="font-medium mb-2">Tamanho</h4>
            <RadioGroup
              value={selectedSize}
              onValueChange={v => setSelectedSize(v as PizzaSize)}
              className="grid grid-cols-4 gap-2"
            >
              {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map(size => (
                <Label
                  key={size}
                  className="border rounded-lg p-3 text-center cursor-pointer"
                >
                  <RadioGroupItem value={size} className="sr-only" />
                  <strong>{size}</strong>
                  <span className="block text-xs text-muted-foreground">
                    {sizeLabels[size]}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* SABORES */}
          <div>
            <h4 className="font-medium mb-2">Quantos sabores?</h4>
            <RadioGroup
              value={String(flavorCount)}
              onValueChange={v => {
                const count = Number(v) as 1 | 2;
                setFlavorCount(count);
                setSelectedFlavors([flavor]);
              }}
              className="flex gap-4"
            >
              <Label><RadioGroupItem value="1" /> 1 sabor</Label>
              <Label><RadioGroupItem value="2" /> 2 sabores</Label>
            </RadioGroup>

            {flavorCount === 2 && (
              <div className="mt-4 space-y-4">
                {Object.entries(groupedFlavors).map(([category, items]) => (
                  <div key={category}>
                    <h5 className="font-semibold mb-2">{category}</h5>
                    {items.map(f => {
                      const selected = selectedFlavors.some(s => s.id === f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => toggleFlavor(f)}
                          className={`p-2 border rounded flex justify-between cursor-pointer ${
                            selected ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <span>{f.name}</span>
                          {selected && <Check className="w-4 h-4" />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BORDA */}
          <div>
            <h4 className="font-medium mb-2">Borda recheada</h4>
            {borders.map(border => (
              <div
                key={border.id}
                onClick={() =>
                  setSelectedBorder(
                    selectedBorder?.id === border.id ? undefined : border
                  )
                }
                className={`p-2 border rounded cursor-pointer ${
                  selectedBorder?.id === border.id
                    ? 'border-primary bg-primary/5'
                    : ''
                }`}
              >
                {border.name} (+ R$ {border.prices[selectedSize].toFixed(2)})
              </div>
            ))}
          </div>

          {/* RESUMO */}
          <div className="border-t pt-4">
            {isInvalidTwoFlavors && (
              <p className="text-sm text-red-500 mb-2">
                Escolha mais 1 sabor
              </p>
            )}

            <div className="flex justify-between items-center">
              <strong className="text-xl">
                R$ {calculatePrice().toFixed(2)}
              </strong>
              <Button
                disabled={isInvalidTwoFlavors}
                onClick={() => {
                  addPizza(selectedSize, selectedFlavors, selectedBorder);
                  toast.success('Pizza adicionada 🍕');
                  setIsOpen(false);
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};