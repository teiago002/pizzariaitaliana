import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Pizza, GlassWater } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { PizzaFlavor, PizzaBorder, Product, PizzaSize } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const AdminProducts: React.FC = () => {
  const { 
    flavors, addFlavor, updateFlavor, removeFlavor,
    borders, addBorder, updateBorder, removeBorder,
    products, addProduct, updateProduct, removeProduct 
  } = useStore();

  const [flavorForm, setFlavorForm] = useState<Partial<PizzaFlavor>>({
    name: '',
    description: '',
    ingredients: [],
    prices: { P: 0, M: 0, G: 0, GG: 0 },
  });
  const [borderForm, setBorderForm] = useState<Partial<PizzaBorder>>({ name: '', price: 0 });
  const [productForm, setProductForm] = useState<Partial<Product>>({ 
    name: '', 
    description: '', 
    price: 0, 
    category: 'Bebidas',
    available: true 
  });
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [isFlavorModalOpen, setIsFlavorModalOpen] = useState(false);
  const [isBorderModalOpen, setIsBorderModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Flavor handlers
  const handleSaveFlavor = () => {
    if (!flavorForm.name || !flavorForm.description) {
      toast.error('Preencha todos os campos');
      return;
    }

    const flavorData: PizzaFlavor = {
      id: editingId || `flavor-${Date.now()}`,
      name: flavorForm.name!,
      description: flavorForm.description!,
      ingredients: ingredientsInput.split(',').map(i => i.trim()).filter(Boolean),
      prices: flavorForm.prices as { P: number; M: number; G: number; GG: number },
    };

    if (editingId) {
      updateFlavor(editingId, flavorData);
      toast.success('Sabor atualizado');
    } else {
      addFlavor(flavorData);
      toast.success('Sabor adicionado');
    }

    setFlavorForm({ name: '', description: '', ingredients: [], prices: { P: 0, M: 0, G: 0, GG: 0 } });
    setIngredientsInput('');
    setEditingId(null);
    setIsFlavorModalOpen(false);
  };

  const handleEditFlavor = (flavor: PizzaFlavor) => {
    setFlavorForm(flavor);
    setIngredientsInput(flavor.ingredients.join(', '));
    setEditingId(flavor.id);
    setIsFlavorModalOpen(true);
  };

  const handleDeleteFlavor = (id: string) => {
    removeFlavor(id);
    toast.success('Sabor removido');
  };

  // Border handlers
  const handleSaveBorder = () => {
    if (!borderForm.name) {
      toast.error('Informe o nome da borda');
      return;
    }

    const borderData: PizzaBorder = {
      id: editingId || `border-${Date.now()}`,
      name: borderForm.name!,
      price: borderForm.price || 0,
    };

    if (editingId) {
      updateBorder(editingId, borderData);
      toast.success('Borda atualizada');
    } else {
      addBorder(borderData);
      toast.success('Borda adicionada');
    }

    setBorderForm({ name: '', price: 0 });
    setEditingId(null);
    setIsBorderModalOpen(false);
  };

  const handleEditBorder = (border: PizzaBorder) => {
    setBorderForm(border);
    setEditingId(border.id);
    setIsBorderModalOpen(true);
  };

  const handleDeleteBorder = (id: string) => {
    removeBorder(id);
    toast.success('Borda removida');
  };

  // Product handlers
  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.price) {
      toast.error('Preencha todos os campos');
      return;
    }

    const productData: Product = {
      id: editingId || `prod-${Date.now()}`,
      name: productForm.name!,
      description: productForm.description || '',
      price: productForm.price!,
      category: productForm.category || 'Bebidas',
      available: productForm.available ?? true,
    };

    if (editingId) {
      updateProduct(editingId, productData);
      toast.success('Produto atualizado');
    } else {
      addProduct(productData);
      toast.success('Produto adicionado');
    }

    setProductForm({ name: '', description: '', price: 0, category: 'Bebidas', available: true });
    setEditingId(null);
    setIsProductModalOpen(false);
  };

  const handleEditProduct = (product: Product) => {
    setProductForm(product);
    setEditingId(product.id);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    removeProduct(id);
    toast.success('Produto removido');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Produtos</h1>
        <p className="text-muted-foreground">Gerencie pizzas, bordas e bebidas</p>
      </div>

      <Tabs defaultValue="flavors">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flavors">Sabores</TabsTrigger>
          <TabsTrigger value="borders">Bordas</TabsTrigger>
          <TabsTrigger value="products">Bebidas</TabsTrigger>
        </TabsList>

        {/* Flavors Tab */}
        <TabsContent value="flavors" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isFlavorModalOpen} onOpenChange={setIsFlavorModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setFlavorForm({ name: '', description: '', ingredients: [], prices: { P: 0, M: 0, G: 0, GG: 0 } });
                  setIngredientsInput('');
                  setEditingId(null);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Sabor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Sabor' : 'Novo Sabor'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={flavorForm.name}
                      onChange={(e) => setFlavorForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Margherita"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={flavorForm.description}
                      onChange={(e) => setFlavorForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Breve descrição do sabor"
                    />
                  </div>
                  <div>
                    <Label>Ingredientes (separados por vírgula)</Label>
                    <Input
                      value={ingredientsInput}
                      onChange={(e) => setIngredientsInput(e.target.value)}
                      placeholder="Molho, Mussarela, Manjericão"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map(size => (
                      <div key={size}>
                        <Label className="text-xs">{size}</Label>
                        <Input
                          type="number"
                          value={flavorForm.prices?.[size] || ''}
                          onChange={(e) => setFlavorForm(prev => ({
                            ...prev,
                            prices: { ...prev.prices!, [size]: parseFloat(e.target.value) || 0 }
                          }))}
                          placeholder="0.00"
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSaveFlavor} className="w-full">
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {flavors.map((flavor, index) => (
              <motion.div
                key={flavor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {flavor.image ? (
                          <img src={flavor.image} alt={flavor.name} className="w-full h-full object-cover" />
                        ) : (
                          <Pizza className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{flavor.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{flavor.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          P: R${flavor.prices.P} | M: R${flavor.prices.M} | G: R${flavor.prices.G} | GG: R${flavor.prices.GG}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditFlavor(flavor)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteFlavor(flavor.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Borders Tab */}
        <TabsContent value="borders" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isBorderModalOpen} onOpenChange={setIsBorderModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setBorderForm({ name: '', price: 0 });
                  setEditingId(null);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Borda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Borda' : 'Nova Borda'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={borderForm.name}
                      onChange={(e) => setBorderForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Catupiry"
                    />
                  </div>
                  <div>
                    <Label>Preço Adicional</Label>
                    <Input
                      type="number"
                      value={borderForm.price}
                      onChange={(e) => setBorderForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handleSaveBorder} className="w-full">
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {borders.map((border, index) => (
              <motion.div
                key={border.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{border.name}</h3>
                      <p className="text-sm text-primary">
                        {border.price > 0 ? `+R$ ${border.price.toFixed(2)}` : 'Grátis'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditBorder(border)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteBorder(border.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setProductForm({ name: '', description: '', price: 0, category: 'Bebidas', available: true });
                  setEditingId(null);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Coca-Cola 2L"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Breve descrição"
                    />
                  </div>
                  <div>
                    <Label>Preço</Label>
                    <Input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Input
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Bebidas"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Disponível</Label>
                    <Switch
                      checked={productForm.available}
                      onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, available: checked }))}
                    />
                  </div>
                  <Button onClick={handleSaveProduct} className="w-full">
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={!product.available ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <GlassWater className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-primary">R$ {product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditProduct(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;
