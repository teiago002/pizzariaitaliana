import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { PizzaCard } from '@/components/public/PizzaCard';
import { ProductCard } from '@/components/public/ProductCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MenuPage: React.FC = () => {
  const { flavors, products, isLoadingFlavors, isLoadingProducts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFlavors = flavors.filter(f =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group flavors by category
  const flavorsByCategory = useMemo(() => {
    const groups: { categoryName: string; categoryId: string | undefined; flavors: typeof filteredFlavors }[] = [];
    const categoryMap = new Map<string, typeof filteredFlavors>();
    const uncategorized: typeof filteredFlavors = [];

    filteredFlavors.forEach(f => {
      if (f.categoryName && f.categoryId) {
        const key = f.categoryId;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, []);
        }
        categoryMap.get(key)!.push(f);
      } else {
        uncategorized.push(f);
      }
    });

    // Add categorized groups
    categoryMap.forEach((catFlavors, categoryId) => {
      groups.push({
        categoryName: catFlavors[0].categoryName!,
        categoryId,
        flavors: catFlavors,
      });
    });

    // Add uncategorized at the end
    if (uncategorized.length > 0) {
      groups.push({
        categoryName: 'Outras Pizzas',
        categoryId: undefined,
        flavors: uncategorized,
      });
    }

    return groups;
  }, [filteredFlavors]);

  const productCategories = [...new Set(products.map(p => p.category))];

  const isLoading = isLoadingFlavors || isLoadingProducts;

  return (
    <div className="min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Nosso Cardápio
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Escolha entre nossas deliciosas pizzas artesanais e bebidas
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar no cardápio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="pizzas" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="pizzas" className="text-base">
                🍕 Pizzas
              </TabsTrigger>
              <TabsTrigger value="bebidas" className="text-base">
                🥤 Bebidas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pizzas">
              {flavorsByCategory.length > 0 ? (
                <div className="space-y-10">
                  {flavorsByCategory.map((group) => (
                    <div key={group.categoryId || 'other'}>
                      <motion.h3
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="font-display text-2xl font-semibold text-foreground mb-6 border-l-4 border-primary pl-4"
                      >
                        {group.categoryName}
                      </motion.h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {group.flavors.map((flavor, index) => (
                          <motion.div
                            key={flavor.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <PizzaCard flavor={flavor} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhuma pizza encontrada</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bebidas">
              {productCategories.map((category) => {
                const categoryProducts = filteredProducts.filter(p => p.category === category);
                if (categoryProducts.length === 0) return null;

                return (
                  <div key={category} className="mb-8">
                    <h3 className="font-display text-xl font-semibold text-foreground mb-4">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryProducts.map((product, index) => (
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
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
