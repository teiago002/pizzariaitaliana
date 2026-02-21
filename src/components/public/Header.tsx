import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Lock } from 'lucide-react';
import { PizzaFlavor, PizzaSize, PizzaBorder } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isPizzeriaOpen, getNextOpeningMessage } from '@/utils/isPizzeriaOpen';

interface PizzaCardProps {
  flavor: PizzaFlavor;
}

export const PizzaCard: React.FC<PizzaCardProps> = ({ flavor }) => {
  const { borders, flavors: allFlavors, operatingHours } = useStore();
  const { addPizza } = useCart();

  const openNow = isPizzeriaOpen(operatingHours);
  const closedMessage = getNextOpeningMessage(operatingHours);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('M');
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([flavor]);
  const [wantsBorder, setWantsBorder] = useState(false);
  const [selectedBorder, setSelectedBorder] = useState<PizzaBorder | undefined>();
  const [flavorCount, setFlavorCount] = useState<1 | 2>(1);

  const handleOpenModal = () => {
    if (!openNow) {
      toast.error(closedMessage);
      return;
    }

    setSelectedFlavors([flavor]);
    setFlavorCount(1);
    setWantsBorder(false);
    setSelectedBorder(undefined);
    setIsOpen(true);
  };

  const handleAddToCart = () => {
    if (!openNow) {
      toast.error('Pedidos somente dentro do horário de funcionamento.');
      return;
    }

    addPizza(selectedSize, selectedFlavors, wantsBorder ? selectedBorder : undefined);
    toast.success('Pizza adicionada ao carrinho 🍕');
    setIsOpen(false);
  };

  const calculatePrice = () => {
    const flavorPrice =
      selectedFlavors.length === 2
        ? selectedFlavors.reduce(
            (sum, f) => sum + f.prices[selectedSize] / 2,
            0
          )
        : Math.max(...selectedFlavors.map(f => f.prices[selectedSize]));

    const borderPrice =
      wantsBorder && selectedBorder
        ? selectedBorder.prices?.[selectedSize] || selectedBorder.price
        : 0;

    return flavorPrice + borderPrice;
  };

  const toggleSecondFlavor = (flavorToToggle: PizzaFlavor) => {
    if (flavorCount === 1) return;

    const exists = selectedFlavors.some(f => f.id === flavorToToggle.id);

    if (exists && selectedFlavors.length > 1) {
      setSelectedFlavors(prev => prev.filter(f => f.id !== flavorToToggle.id));
    } else if (!exists && selectedFlavors.length < 2) {
      setSelectedFlavors(prev => [...prev, flavorToToggle]);
    }
  };

  const sizeLabels: Record<PizzaSize, string> = {
    P: 'Pequena',
    M: 'Média',
    G: 'Grande',
    GG: 'Gigante',
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: openNow ? -4 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          onClick={handleOpenModal}
          className={`overflow-hidden h-full transition ${
            openNow ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'
          }`}
        >
          <div className="relative aspect-square overflow-hidden">
            <img
              src={flavor.image}
              alt={flavor.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            {!openNow && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center px-4">
                <Lock className="w-6 h-6 text-white mb-2" />
                <p className="text-white font-semibold text-lg">Estamos fechados</p>
                <p className="text-white/80 text-sm mt-1">{closedMessage}</p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-display text-xl font-bold text-background">
                {flavor.name}
              </h3>
              <p className="text-background/80 text-sm line-clamp-1">
                {flavor.description}
              </p>
            </div>

            <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
              A partir de R$ {flavor.prices.P.toFixed(2)}
            </Badge>
          </div>

          <CardContent className="p-4">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {flavor.ingredients.map((ing, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ing}
                </Badge>
              ))}
            </div>

            <Button className="w-full" disabled={!openNow}>
              <Plus className="w-4 h-4 mr-2" />
              {openNow ? 'Escolher pizza' : 'Fechado'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Monte sua pizza 🍕
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* TAMANHO */}
            <div>
              <h4 className="font-medium mb-3">Tamanho</h4>
              <RadioGroup
                value={selectedSize}
                onValueChange={v => setSelectedSize(v as PizzaSize)}
                className="grid grid-cols-4 gap-2"
              >
                {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map(size => (
                  <div key={size}>
                    <RadioGroupItem
                      value={size}
                      id={`size-${size}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`size-${size}`}
                      className="flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <span className="font-semibold">{size}</span>
                      <span className="text-xs text-muted-foreground">
                        {sizeLabels[size]}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* TOTAL */}
            <div className="pt-4 border-t">
              <div className="flex justify-between mb-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {calculatePrice().toFixed(2)}
                </span>
              </div>

              <Button
                onClick={handleAddToCart}
                className="w-full"
                size="lg"
                disabled={flavorCount === 2 && selectedFlavors.length < 2}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ao carrinho
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};