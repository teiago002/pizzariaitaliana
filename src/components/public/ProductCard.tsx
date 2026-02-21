import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, ChevronLeft } from 'lucide-react';
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
  product_id: string;
}

interface ProductCardProps {
  product: Product;
}

// Size-first card: user picks a size, then sees available drinks in that size
export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addProduct } = useCart();

  const handleAdd = () => {
    addProduct(product);
    toast.success(`${product.name} adicionado ao carrinho!`);
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
              <p className="text-lg font-bold text-primary mt-1">
                R$ {product.price.toFixed(2)}
              </p>
            </div>

            <Button
              size="icon"
              onClick={handleAdd}
              disabled={!product.available}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Size-first drink selection component for the menu
interface DrinkSizeSelectorProps {
  products: Product[];
}

export const DrinkSizeSelector: React.FC<DrinkSizeSelectorProps> = ({ products }) => {
  const { addProduct } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Fetch all variants for all products
  const productIds = products.map(p => p.id);
  const { data: allVariants = [] } = useQuery<ProductVariant[]>({
    queryKey: ['product-variants-all', productIds.join(',')],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .in('product_id', productIds)
        .eq('available', true)
        .order('price');
      if (error) return [];
      return data as ProductVariant[];
    },
    enabled: productIds.length > 0,
  });

  // Get unique sizes
  const availableSizes = useMemo(() => {
    const sizes = new Set(allVariants.map(v => v.size_label));
    return Array.from(sizes).sort();
  }, [allVariants]);

  // Products that have variants
  const productsWithVariants = useMemo(() => {
    const ids = new Set(allVariants.map(v => v.product_id));
    return products.filter(p => ids.has(p.id));
  }, [products, allVariants]);

  // Products without variants (show normally)
  const productsWithoutVariants = useMemo(() => {
    const ids = new Set(allVariants.map(v => v.product_id));
    return products.filter(p => !ids.has(p.id));
  }, [products, allVariants]);

  // Filtered products for selected size
  const filteredBySize = useMemo(() => {
    if (!selectedSize) return [];
    const variantsForSize = allVariants.filter(v => v.size_label === selectedSize);
    return variantsForSize.map(v => {
      const product = products.find(p => p.id === v.product_id);
      return product ? { product, variant: v } : null;
    }).filter(Boolean) as { product: Product; variant: ProductVariant }[];
  }, [selectedSize, allVariants, products]);

  const handleAddVariant = (product: Product, variant: ProductVariant) => {
    const variantProduct: Product = {
      ...product,
      name: `${product.name} ${variant.size_label}`,
      price: variant.price,
    };
    addProduct(variantProduct);
    toast.success(`${product.name} ${variant.size_label} adicionado ao carrinho!`);
  };

  if (productsWithVariants.length === 0) {
    // No variants, show simple cards
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Size selector */}
      {availableSizes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Escolha o tamanho:</h4>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map(size => (
              <Button
                key={size}
                variant={selectedSize === size ? 'default' : 'outline'}
                onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                className="rounded-full"
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Show drinks for selected size */}
      <AnimatePresence mode="wait">
        {selectedSize && (
          <motion.div
            key={selectedSize}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSize(null)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <h4 className="font-semibold text-foreground">
                Bebidas — {selectedSize}
              </h4>
              <Badge variant="secondary">{filteredBySize.length} opções</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBySize.map(({ product, variant }, index) => (
                <motion.div
                  key={variant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">🥤</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                          <Badge variant="outline" className="text-xs mt-1">{variant.size_label}</Badge>
                          <p className="text-lg font-bold text-primary mt-1">
                            R$ {variant.price.toFixed(2)}
                          </p>
                        </div>
                        <Button size="icon" onClick={() => handleAddVariant(product, variant)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products without variants */}
      {productsWithoutVariants.length > 0 && !selectedSize && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Outros:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productsWithoutVariants.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
