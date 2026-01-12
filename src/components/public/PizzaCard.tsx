import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
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

interface PizzaCardProps {
  flavor: PizzaFlavor;
}

export const PizzaCard: React.FC<PizzaCardProps> = ({ flavor }) => {
  const { sizes, borders } = useStore();
  const { addPizza } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('M');
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([flavor]);
  const [wantsBorder, setWantsBorder] = useState(false);
  const [selectedBorder, setSelectedBorder] = useState<PizzaBorder | undefined>();
  const [flavorCount, setFlavorCount] = useState<1 | 2>(1);

  const { flavors: allFlavors } = useStore();

  const handleOpenModal = () => {
    setSelectedFlavors([flavor]);
    setFlavorCount(1);
    setWantsBorder(false);
    setSelectedBorder(undefined);
    setIsOpen(true);
  };

  const handleAddToCart = () => {
    addPizza(selectedSize, selectedFlavors, wantsBorder ? selectedBorder : undefined);
    toast.success('Pizza adicionada ao carrinho!');
    setIsOpen(false);
  };

  const calculatePrice = () => {
    const flavorPrice = Math.max(...selectedFlavors.map(f => f.prices[selectedSize]));
    const borderPrice = wantsBorder && selectedBorder ? selectedBorder.price : 0;
    return flavorPrice + borderPrice;
  };

  const toggleSecondFlavor = (flavorToToggle: PizzaFlavor) => {
    if (flavorCount === 1) return;
    
    const isSelected = selectedFlavors.some(f => f.id === flavorToToggle.id);
    
    if (isSelected && selectedFlavors.length > 1) {
      setSelectedFlavors(prev => prev.filter(f => f.id !== flavorToToggle.id));
    } else if (!isSelected && selectedFlavors.length < 2) {
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
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden group cursor-pointer h-full" onClick={handleOpenModal}>
          <div className="relative aspect-square overflow-hidden">
            <img
              src={flavor.image}
              alt={flavor.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-display text-xl font-bold text-background mb-1">
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
              {flavor.ingredients.slice(0, 4).map((ing, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ing}
                </Badge>
              ))}
              {flavor.ingredients.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{flavor.ingredients.length - 4}
                </Badge>
              )}
            </div>
            <Button className="w-full" variant="default">
              <Plus className="w-4 h-4 mr-2" />
              Escolher
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Monte sua Pizza</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Size Selection */}
            <div>
              <h4 className="font-medium mb-3">Tamanho</h4>
              <RadioGroup
                value={selectedSize}
                onValueChange={(v) => setSelectedSize(v as PizzaSize)}
                className="grid grid-cols-4 gap-2"
              >
                {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map((size) => (
                  <div key={size}>
                    <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" />
                    <Label
                      htmlFor={`size-${size}`}
                      className="flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <span className="font-semibold">{size}</span>
                      <span className="text-xs text-muted-foreground">{sizeLabels[size]}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Flavor Count */}
            <div>
              <h4 className="font-medium mb-3">Quantidade de Sabores</h4>
              <div className="flex gap-2">
                <Button
                  variant={flavorCount === 1 ? 'default' : 'outline'}
                  onClick={() => {
                    setFlavorCount(1);
                    setSelectedFlavors([flavor]);
                  }}
                  className="flex-1"
                >
                  1 Sabor
                </Button>
                <Button
                  variant={flavorCount === 2 ? 'default' : 'outline'}
                  onClick={() => setFlavorCount(2)}
                  className="flex-1"
                >
                  2 Sabores
                </Button>
              </div>
            </div>

            {/* Second Flavor Selection */}
            {flavorCount === 2 && (
              <div>
                <h4 className="font-medium mb-3">Selecione os Sabores ({selectedFlavors.length}/2)</h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {allFlavors.map((f) => {
                    const isSelected = selectedFlavors.some(sf => sf.id === f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleSecondFlavor(f)}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                          <span className="font-medium text-sm">{f.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Border Selection */}
            <div>
              <h4 className="font-medium mb-3">Borda Recheada?</h4>
              <div className="flex gap-2 mb-3">
                <Button
                  variant={!wantsBorder ? 'default' : 'outline'}
                  onClick={() => {
                    setWantsBorder(false);
                    setSelectedBorder(undefined);
                  }}
                  className="flex-1"
                >
                  Não
                </Button>
                <Button
                  variant={wantsBorder ? 'default' : 'outline'}
                  onClick={() => setWantsBorder(true)}
                  className="flex-1"
                >
                  Sim
                </Button>
              </div>

              {wantsBorder && (
                <RadioGroup
                  value={selectedBorder?.id || ''}
                  onValueChange={(v) => setSelectedBorder(borders.find(b => b.id === v))}
                  className="space-y-2"
                >
                  {borders.filter(b => b.price > 0).map((border) => (
                    <div key={border.id} className="flex items-center space-x-3">
                      <RadioGroupItem value={border.id} id={border.id} />
                      <Label htmlFor={border.id} className="flex-1 cursor-pointer">
                        <span>{border.name}</span>
                        <span className="text-muted-foreground ml-2">+R$ {border.price.toFixed(2)}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            {/* Price and Add Button */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Total:</span>
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
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
