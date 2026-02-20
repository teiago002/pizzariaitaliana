import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  size_label: string;
  price: number;
  available: boolean;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addProduct } = useCart();
  const [showVariants, setShowVariants] = useState(false);

  // Fetch variants for this product
  const { data: variants = [] } = useQuery<ProductVariant[]>({
    queryKey: ['product-variants', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('available', true)
        .order('price');
      if (error) return [];
      return data as ProductVariant[];
    },
  });

  const hasVariants = variants.length > 0;

  const handleAddDefault = () => {
    if (hasVariants) {
      setShowVariants(!showVariants);
      return;
    }
    addProduct(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const handleAddVariant = (variant: ProductVariant) => {
    const variantProduct: Product = {
      ...product,
      name: `${product.name} ${variant.size_label}`,
      price: variant.price,
    };
    addProduct(variantProduct);
    toast.success(`${product.name} ${variant.size_label} adicionado ao carrinho!`);
    setShowVariants(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden h-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Product Image */}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🥤
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
              )}

              {hasVariants ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {variants.slice(0, 3).map(v => (
                    <Badge key={v.id} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {v.size_label} · R$ {v.price.toFixed(2)}
                    </Badge>
                  ))}
                  {variants.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      +{variants.length - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-lg font-bold text-primary mt-1">
                  R$ {product.price.toFixed(2)}
                </p>
              )}
            </div>

            <Button
              size="icon"
              onClick={handleAddDefault}
              disabled={!product.available}
              variant={hasVariants && showVariants ? 'secondary' : 'default'}
            >
              {hasVariants ? (
                <ChevronDown className={`w-4 h-4 transition-transform ${showVariants ? 'rotate-180' : ''}`} />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Variants expanded */}
          <AnimatePresence>
            {hasVariants && showVariants && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => handleAddVariant(v)}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-sm font-medium">{v.size_label}</span>
                      <span className="text-sm font-bold text-primary">R$ {v.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
