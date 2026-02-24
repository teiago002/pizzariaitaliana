import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [isOpen, setIsOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('M');
  const [flavorCount, setFlavorCount] = useState<1 | 2>(1);
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([flavor]);
  const [selectedBorder, setSelectedBorder] = useState<PizzaBorder>();

  const openNow = settings.isOpen;

  /* ---------------- GROUP FLAVORS ---------------- */
  const groupedFlavors = useMemo(() => {
    const groups: Record<string, PizzaFlavor[]> = {};
    flavors.forEach(f => {
      const cat = f.categoryName || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });
    return groups;
  }, [flavors]);

  /* ---------------- HELPERS ---------------- */
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
    const flavorPrice =
      selectedFlavors.length === 2
        ? selectedFlavors.reduce(
            (sum, f) => sum + f.prices[selectedSize] / 2,
            0
          )
        : selectedFlavors[0].prices[selectedSize];

    const borderPrice = selectedBorder
      ? selectedBorder.prices[selectedSize]
      : 0;

    return flavorPrice + borderPrice;
  };

  const sizeLabels: Record<PizzaSize, string> = {
    P: 'Pequena',
    M: 'Média',
    G: 'Grande',
    GG: 'Gigante',
  };

  const invalidTwoFlavors =
    flavorCount === 2 && selectedFlavors.length < 2;

  /* ---------------- CARD ---------------- */
  return (
    <>
      <motion.div whileHover={{ y: openNow ? -4 : 0 }}>
        <Card
          onClick={() => openNow && setIsOpen(true)}
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
              <h3 className="text-white font-bold text-xl">
                {flavor.name}
              </h3>
              <p className="text-white/80 text-xs line-clamp-2">
                {flavor.ingredients?.join(', ')}
              </p>
            </div>

            {!openNow && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <Lock className="text-white" />
              </div>
            )}

            <Badge className="absolute top-3 right-3">
              A partir de R$ {flavor.prices.P.toFixed(2)}
            </Badge>
          </div>

          <CardContent>
            <Button className="w-full mt-4" disabled={!openNow}>
              <Plus className="mr-2 h-4 w-4" />
              Escolher pizza
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------------- MODAL ---------------- */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Monte sua pizza 🍕
            </DialogTitle>
          </DialogHeader>

          {/* PREVIEW */}
          <motion.div className="h-48 rounded-xl overflow-hidden border mb-6">
            {selectedFlavors.length === 2 ? (
              <div className="flex h-full">
                {selectedFlavors.map(f => (
                  <motion.img
                    key={f.id}
                    src={f.image}
                    className="w-1/2 h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                ))}
              </div>
            ) : (
              <motion.img
                key={selectedFlavors[0].id}
                src={selectedFlavors[0].image}
                className="w-full h-full object-cover"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              />
            )}
          </motion.div>

          {/* TAMANHO */}
          <section className="space-y-3">
            <h4 className="font-semibold">Tamanho</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map(size => (
                <motion.button
                  key={size}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-xl border p-4 ${
                    selectedSize === size
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <strong>{size}</strong>
                  <p className="text-xs">{sizeLabels[size]}</p>
                  <p className="font-semibold">
                    R$ {flavor.prices[size].toFixed(2)}
                  </p>
                </motion.button>
              ))}
            </div>
          </section>

          {/* SABORES */}
          <section className="space-y-4 mt-6">
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
                  <h5 className="font-medium mb-2">{cat}</h5>
                  <div className="grid gap-2">
                    {items.map(f => {
                      const selected = selectedFlavors.some(
                        s => s.id === f.id
                      );
                      return (
                        <motion.button
                          key={f.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleFlavor(f)}
                          className={`flex justify-between p-3 border rounded-lg ${
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'hover:border-primary/50'
                          }`}
                        >
                          {f.name}
                          {selected && <Check />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
          </section>

          {/* BORDA */}
          <section className="space-y-3 mt-6">
            <h4 className="font-semibold">Borda recheada</h4>

            <button
              onClick={() => setSelectedBorder(undefined)}
              className={`w-full p-3 border rounded-lg ${
                !selectedBorder ? 'border-primary bg-primary/10' : ''
              }`}
            >
              Sem borda — R$ 0,00
            </button>

            {borders.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBorder(b)}
                className={`w-full p-3 border rounded-lg ${
                  selectedBorder?.id === b.id
                    ? 'border-primary bg-primary/10'
                    : 'hover:border-primary/50'
                }`}
              >
                {b.name} (+ R$ {b.prices[selectedSize].toFixed(2)})
              </button>
            ))}
          </section>

          {/* CARRINHO FLUTUANTE */}
          <section className="sticky bottom-0 bg-background border-t pt-4 mt-6">
            {invalidTwoFlavors && (
              <p className="text-sm text-red-500 mb-2">
                Escolha mais 1 sabor
              </p>
            )}

            <div className="flex justify-between items-center">
              <motion.strong
                key={calculatePrice()}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl"
              >
                R$ {calculatePrice().toFixed(2)}
              </motion.strong>

              <Button
                size="lg"
                disabled={invalidTwoFlavors}
                onClick={() => {
                  addPizza(selectedSize, selectedFlavors, selectedBorder);
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