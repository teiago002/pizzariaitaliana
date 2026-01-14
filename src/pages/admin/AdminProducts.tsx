import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tables } from '@/integrations/supabase/types';

type PizzaFlavor = Tables<'pizza_flavors'>;
type PizzaBorder = Tables<'pizza_borders'>;
type Product = Tables<'products'>;

const AdminProducts: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pizza Flavor Dialog
  const [flavorDialogOpen, setFlavorDialogOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<PizzaFlavor | null>(null);
  const [flavorForm, setFlavorForm] = useState({
    name: '',
    description: '',
    ingredients: '',
    price_p: 0,
    price_m: 0,
    price_g: 0,
    price_gg: 0,
    available: true,
    image_url: '',
  });
  const [flavorImageFile, setFlavorImageFile] = useState<File | null>(null);

  // Border Dialog
  const [borderDialogOpen, setBorderDialogOpen] = useState(false);
  const [editingBorder, setEditingBorder] = useState<PizzaBorder | null>(null);
  const [borderForm, setBorderForm] = useState({
    name: '',
    price: 0,
    available: true,
  });

  // Product Dialog
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Bebidas',
    available: true,
    image_url: '',
  });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  // Fetch pizza flavors
  const { data: flavors = [], isLoading: loadingFlavors } = useQuery({
    queryKey: ['admin-pizza-flavors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_flavors')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch borders
  const { data: borders = [], isLoading: loadingBorders } = useQuery({
    queryKey: ['admin-pizza-borders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_borders')
        .select('*')
        .order('price');
      if (error) throw error;
      return data;
    },
  });

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Upload image helper
  const uploadImage = async (file: File, bucket: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // Pizza Flavor mutations
  const saveFlavorMutation = useMutation({
    mutationFn: async (data: Partial<PizzaFlavor>) => {
      let imageUrl = data.image_url;
      
      if (flavorImageFile) {
        const uploadedUrl = await uploadImage(flavorImageFile, 'product-images');
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const payload = { ...data, image_url: imageUrl };

      if (editingFlavor) {
        const { error } = await supabase
          .from('pizza_flavors')
          .update(payload)
          .eq('id', editingFlavor.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pizza_flavors')
          .insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pizza-flavors'] });
      queryClient.invalidateQueries({ queryKey: ['pizza-flavors'] });
      toast.success(editingFlavor ? 'Sabor atualizado!' : 'Sabor criado!');
      setFlavorDialogOpen(false);
      resetFlavorForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar sabor: ' + error.message);
    },
  });

  const deleteFlavorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pizza_flavors')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pizza-flavors'] });
      queryClient.invalidateQueries({ queryKey: ['pizza-flavors'] });
      toast.success('Sabor excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir sabor: ' + error.message);
    },
  });

  // Border mutations
  const saveBorderMutation = useMutation({
    mutationFn: async (data: Partial<PizzaBorder>) => {
      if (editingBorder) {
        const { error } = await supabase
          .from('pizza_borders')
          .update(data)
          .eq('id', editingBorder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pizza_borders')
          .insert([data as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pizza-borders'] });
      queryClient.invalidateQueries({ queryKey: ['pizza-borders'] });
      toast.success(editingBorder ? 'Borda atualizada!' : 'Borda criada!');
      setBorderDialogOpen(false);
      resetBorderForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar borda: ' + error.message);
    },
  });

  const deleteBorderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pizza_borders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pizza-borders'] });
      queryClient.invalidateQueries({ queryKey: ['pizza-borders'] });
      toast.success('Borda excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir borda: ' + error.message);
    },
  });

  // Product mutations
  const saveProductMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      let imageUrl = data.image_url;
      
      if (productImageFile) {
        const uploadedUrl = await uploadImage(productImageFile, 'product-images');
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const payload = { ...data, image_url: imageUrl };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([payload as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editingProduct ? 'Produto atualizado!' : 'Produto criado!');
      setProductDialogOpen(false);
      resetProductForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar produto: ' + error.message);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir produto: ' + error.message);
    },
  });

  // Form helpers
  const resetFlavorForm = () => {
    setEditingFlavor(null);
    setFlavorForm({
      name: '',
      description: '',
      ingredients: '',
      price_p: 0,
      price_m: 0,
      price_g: 0,
      price_gg: 0,
      available: true,
      image_url: '',
    });
    setFlavorImageFile(null);
  };

  const resetBorderForm = () => {
    setEditingBorder(null);
    setBorderForm({
      name: '',
      price: 0,
      available: true,
    });
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      category: 'Bebidas',
      available: true,
      image_url: '',
    });
    setProductImageFile(null);
  };

  const openFlavorDialog = (flavor?: PizzaFlavor) => {
    if (flavor) {
      setEditingFlavor(flavor);
      setFlavorForm({
        name: flavor.name,
        description: flavor.description || '',
        ingredients: (flavor.ingredients || []).join(', '),
        price_p: Number(flavor.price_p),
        price_m: Number(flavor.price_m),
        price_g: Number(flavor.price_g),
        price_gg: Number(flavor.price_gg),
        available: flavor.available,
        image_url: flavor.image_url || '',
      });
    } else {
      resetFlavorForm();
    }
    setFlavorDialogOpen(true);
  };

  const openBorderDialog = (border?: PizzaBorder) => {
    if (border) {
      setEditingBorder(border);
      setBorderForm({
        name: border.name,
        price: Number(border.price),
        available: border.available,
      });
    } else {
      resetBorderForm();
    }
    setBorderDialogOpen(true);
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        category: product.category,
        available: product.available,
        image_url: product.image_url || '',
      });
    } else {
      resetProductForm();
    }
    setProductDialogOpen(true);
  };

  const handleSaveFlavor = () => {
    if (!flavorForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveFlavorMutation.mutate({
      name: flavorForm.name,
      description: flavorForm.description,
      ingredients: flavorForm.ingredients.split(',').map(i => i.trim()).filter(Boolean),
      price_p: flavorForm.price_p,
      price_m: flavorForm.price_m,
      price_g: flavorForm.price_g,
      price_gg: flavorForm.price_gg,
      available: flavorForm.available,
      image_url: flavorForm.image_url,
    });
  };

  const handleSaveBorder = () => {
    if (!borderForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveBorderMutation.mutate({
      name: borderForm.name,
      price: borderForm.price,
      available: borderForm.available,
    });
  };

  const handleSaveProduct = () => {
    if (!productForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }
    saveProductMutation.mutate({
      name: productForm.name,
      description: productForm.description,
      price: productForm.price,
      category: productForm.category,
      available: productForm.available,
      image_url: productForm.image_url,
    });
  };

  // Filter data based on search
  const filteredFlavors = flavors.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Gerencie pizzas, bordas e outros produtos</p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="pizzas" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pizzas">🍕 Pizzas</TabsTrigger>
          <TabsTrigger value="bordas">🧀 Bordas</TabsTrigger>
          <TabsTrigger value="outros">🥤 Outros</TabsTrigger>
        </TabsList>

        {/* Pizzas Tab */}
        <TabsContent value="pizzas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openFlavorDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Sabor
            </Button>
          </div>

          {loadingFlavors ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlavors.map((flavor) => (
                <motion.div
                  key={flavor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {flavor.image_url && (
                          <img 
                            src={flavor.image_url} 
                            alt={flavor.name}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold truncate">{flavor.name}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {flavor.description}
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              flavor.available ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                          </div>
                          <div className="flex gap-1 mt-2 text-xs text-muted-foreground">
                            <span>P: R${Number(flavor.price_p).toFixed(0)}</span>
                            <span>M: R${Number(flavor.price_m).toFixed(0)}</span>
                            <span>G: R${Number(flavor.price_g).toFixed(0)}</span>
                            <span>GG: R${Number(flavor.price_gg).toFixed(0)}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openFlavorDialog(flavor)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Excluir este sabor?')) {
                                  deleteFlavorMutation.mutate(flavor.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Bordas Tab */}
        <TabsContent value="bordas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openBorderDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Borda
            </Button>
          </div>

          {loadingBorders ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {borders.map((border) => (
                <motion.div
                  key={border.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{border.name}</h3>
                          <p className="text-lg font-bold text-primary">
                            {Number(border.price) === 0 ? 'Grátis' : `+R$ ${Number(border.price).toFixed(2)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            border.available ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openBorderDialog(border)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Excluir esta borda?')) {
                                deleteBorderMutation.mutate(border.id);
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Outros Produtos Tab */}
        <TabsContent value="outros" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openProductDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </div>

          {loadingProducts ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {product.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs text-muted-foreground">{product.category}</span>
                              <h3 className="font-semibold truncate">{product.name}</h3>
                              <p className="text-lg font-bold text-primary">
                                R$ {Number(product.price).toFixed(2)}
                              </p>
                            </div>
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              product.available ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openProductDialog(product)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Excluir este produto?')) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Flavor Dialog */}
      <Dialog open={flavorDialogOpen} onOpenChange={setFlavorDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFlavor ? 'Editar Sabor' : 'Novo Sabor'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={flavorForm.name}
                onChange={(e) => setFlavorForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Margherita"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={flavorForm.description}
                onChange={(e) => setFlavorForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Pizza tradicional italiana"
              />
            </div>

            <div>
              <Label>Ingredientes (separados por vírgula)</Label>
              <Input
                value={flavorForm.ingredients}
                onChange={(e) => setFlavorForm(f => ({ ...f, ingredients: e.target.value }))}
                placeholder="Ex: Tomate, Mussarela, Manjericão"
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Preço P</Label>
                <Input
                  type="number"
                  value={flavorForm.price_p}
                  onChange={(e) => setFlavorForm(f => ({ ...f, price_p: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Preço M</Label>
                <Input
                  type="number"
                  value={flavorForm.price_m}
                  onChange={(e) => setFlavorForm(f => ({ ...f, price_m: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Preço G</Label>
                <Input
                  type="number"
                  value={flavorForm.price_g}
                  onChange={(e) => setFlavorForm(f => ({ ...f, price_g: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Preço GG</Label>
                <Input
                  type="number"
                  value={flavorForm.price_gg}
                  onChange={(e) => setFlavorForm(f => ({ ...f, price_gg: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <Label>Imagem</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFlavorImageFile(e.target.files?.[0] || null)}
                />
              </div>
              {(flavorForm.image_url || flavorImageFile) && (
                <div className="mt-2 relative w-20 h-20">
                  <img 
                    src={flavorImageFile ? URL.createObjectURL(flavorImageFile) : flavorForm.image_url}
                    alt="Preview"
                    className="w-full h-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFlavorForm(f => ({ ...f, image_url: '' }));
                      setFlavorImageFile(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={flavorForm.available}
                onCheckedChange={(checked) => setFlavorForm(f => ({ ...f, available: checked }))}
              />
              <Label>Disponível</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setFlavorDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveFlavor}
                disabled={saveFlavorMutation.isPending}
              >
                {saveFlavorMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Border Dialog */}
      <Dialog open={borderDialogOpen} onOpenChange={setBorderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBorder ? 'Editar Borda' : 'Nova Borda'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={borderForm.name}
                onChange={(e) => setBorderForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Catupiry"
              />
            </div>

            <div>
              <Label>Preço Adicional</Label>
              <Input
                type="number"
                value={borderForm.price}
                onChange={(e) => setBorderForm(f => ({ ...f, price: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={borderForm.available}
                onCheckedChange={(checked) => setBorderForm(f => ({ ...f, available: checked }))}
              />
              <Label>Disponível</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setBorderDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveBorder}
                disabled={saveBorderMutation.isPending}
              >
                {saveBorderMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Coca-Cola 2L"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Refrigerante gelado"
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Input
                value={productForm.category}
                onChange={(e) => setProductForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Ex: Bebidas"
              />
            </div>

            <div>
              <Label>Preço</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm(f => ({ ...f, price: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label>Imagem</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImageFile(e.target.files?.[0] || null)}
                />
              </div>
              {(productForm.image_url || productImageFile) && (
                <div className="mt-2 relative w-20 h-20">
                  <img 
                    src={productImageFile ? URL.createObjectURL(productImageFile) : productForm.image_url}
                    alt="Preview"
                    className="w-full h-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm(f => ({ ...f, image_url: '' }));
                      setProductImageFile(null);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={productForm.available}
                onCheckedChange={(checked) => setProductForm(f => ({ ...f, available: checked }))}
              />
              <Label>Disponível</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveProduct}
                disabled={saveProductMutation.isPending}
              >
                {saveProductMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
