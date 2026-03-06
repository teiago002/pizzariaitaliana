import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Minus, Trash2, ShoppingBag, Loader2, CreditCard, 
  CheckCircle, ArrowRight, Clock, Search, X, Check, Banknote,
  Copy, QrCode, Split, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/hooks/useAuth';
import { PizzaFlavor, PizzaSize, PizzaBorder, SplitPayment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';

interface LocalOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'pizza';
  observation?: string; // 👈 ADICIONADO
}

interface PendingLocalOrder {
  id: string;
  tableNumber: string;
  customerName: string;
  items: LocalOrderItem[];
  total: number;
  createdAt: Date;
  status: string;
}

const sizeLabels: Record<PizzaSize, string> = {
  P: 'Pequena', M: 'Média', G: 'Grande', GG: 'Gigante',
};

const NewLocalOrder: React.FC = () => {
  const { flavors, products, borders, isLoadingFlavors, isLoadingProducts } = useStore();
  const { user } = useAuth();
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<LocalOrderItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingLocalOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [paymentOrder, setPaymentOrder] = useState<PendingLocalOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card' | 'split'>('cash');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuTab, setMenuTab] = useState<'pizzas' | 'bebidas'>('pizzas');
  const [selectedPizzaCategory, setSelectedPizzaCategory] = useState<string | null>(null);
  
  // Estados para PIX
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [pixLoading, setPixLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos

  // Estados para split payment
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: 'cash', amount: 0 },
    { method: 'card', amount: 0 },
  ]);
  const [splitError, setSplitError] = useState('');

  // Pizza modal state - ATUALIZADO com múltiplas bordas e observação
  const [pizzaModal, setPizzaModal] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState<PizzaFlavor | null>(null);
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('M');
  const [flavorCount, setFlavorCount] = useState<1 | 2>(1);
  const [selectedFlavors, setSelectedFlavors] = useState<PizzaFlavor[]>([]);
  
  // Estados para múltiplas bordas
  const [hasBorder, setHasBorder] = useState(false);
  const [selectedBorders, setSelectedBorders] = useState<PizzaBorder[]>([]);
  
  // Estado para observação
  const [pizzaObservation, setPizzaObservation] = useState('');

  // Timer para o PIX
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPixModal && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showPixModal, timeLeft]);

  useEffect(() => {
    if (showPixModal) {
      setTimeLeft(600);
    }
  }, [showPixModal]);

  // Reset split payments quando mudar de método
  useEffect(() => {
    if (paymentMethod !== 'split') {
      setSplitError('');
    }
  }, [paymentMethod]);

  // Fetch product variants for drinks
  const { data: allVariants = [] } = useQuery({
    queryKey: ['employee-product-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('available', true)
        .order('price');
      if (error) return [];
      return data;
    },
  });

  // Pizza categories
  const pizzaCategories = useMemo(() => {
    const cats: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    flavors.forEach(f => {
      if (f.categoryId && f.categoryName && !seen.has(f.categoryId)) {
        seen.add(f.categoryId);
        cats.push({ id: f.categoryId, name: f.categoryName });
      }
    });
    return cats;
  }, [flavors]);

  // Filtered flavors
  const filteredFlavors = useMemo(() => {
    let result = flavors;
    if (searchTerm) {
      result = result.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedPizzaCategory) {
      result = result.filter(f => f.categoryId === selectedPizzaCategory);
    }
    return result;
  }, [flavors, searchTerm, selectedPizzaCategory]);

  // Grouped flavors by category
  const flavorsByCategory = useMemo(() => {
    const groups: { name: string; id: string | undefined; items: PizzaFlavor[] }[] = [];
    const map = new Map<string, PizzaFlavor[]>();
    const uncategorized: PizzaFlavor[] = [];

    filteredFlavors.forEach(f => {
      if (f.categoryId && f.categoryName) {
        if (!map.has(f.categoryId)) map.set(f.categoryId, []);
        map.get(f.categoryId)!.push(f);
      } else {
        uncategorized.push(f);
      }
    });

    map.forEach((items, id) => {
      groups.push({ name: items[0].categoryName!, id, items });
    });
    if (uncategorized.length > 0) {
      groups.push({ name: 'Outras', id: undefined, items: uncategorized });
    }
    return groups;
  }, [filteredFlavors]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.available &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  // Drink sizes
  const drinkSizes = useMemo(() => {
    const sizes = new Set(allVariants.map(v => v.size_label));
    return Array.from(sizes).sort();
  }, [allVariants]);

  const [selectedDrinkSize, setSelectedDrinkSize] = useState<string | null>(null);

  const drinksForSize = useMemo(() => {
    if (!selectedDrinkSize) return [];
    return allVariants
      .filter(v => v.size_label === selectedDrinkSize)
      .map(v => {
        const product = products.find(p => p.id === v.product_id);
        return product ? { product, variant: v } : null;
      })
      .filter(Boolean) as { product: typeof products[0]; variant: typeof allVariants[0] }[];
  }, [selectedDrinkSize, allVariants, products]);

  // Products without variants
  const productsWithoutVariants = useMemo(() => {
    const variantProductIds = new Set(allVariants.map(v => v.product_id));
    return filteredProducts.filter(p => !variantProductIds.has(p.id));
  }, [filteredProducts, allVariants]);

  // Fetch pending orders
  const fetchPendingLocalOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'local')
      .in('status', ['CONFIRMED', 'PREPARING', 'READY'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingOrders(data.map(o => ({
        id: o.id,
        tableNumber: o.table_number || '',
        customerName: o.customer_name,
        items: (o.items as any[]) || [],
        total: Number(o.total),
        createdAt: new Date(o.created_at),
        status: o.status,
      })));
    }
    setLoadingPending(false);
  };

  useEffect(() => {
    fetchPendingLocalOrders();
    const channel = supabase
      .channel('employee-local-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchPendingLocalOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Pizza modal handlers - ATUALIZADO
  const openPizzaModal = (flavor: PizzaFlavor) => {
    setSelectedFlavor(flavor);
    setSelectedFlavors([flavor]);
    setFlavorCount(1);
    setSelectedSize('M');
    setHasBorder(false);
    setSelectedBorders([]);
    setPizzaObservation('');
    setPizzaModal(true);
  };

  const calculateBorderTotal = () => {
    return selectedBorders.reduce((sum, border) => {
      return sum + (border.prices?.[selectedSize] || border.price || 0);
    }, 0);
  };

  const calculatePizzaPrice = () => {
    let flavorPrice: number;
    if (selectedFlavors.length === 2) {
      flavorPrice = selectedFlavors.reduce((sum, f) => sum + f.prices[selectedSize] / 2, 0);
    } else {
      flavorPrice = Math.max(...selectedFlavors.map(f => f.prices[selectedSize]));
    }
    const borderPrice = calculateBorderTotal();
    return flavorPrice + borderPrice;
  };

  const toggleSecondFlavor = (f: PizzaFlavor) => {
    if (flavorCount === 1) return;
    const isSelected = selectedFlavors.some(sf => sf.id === f.id);
    if (isSelected && selectedFlavors.length > 1) {
      setSelectedFlavors(prev => prev.filter(sf => sf.id !== f.id));
    } else if (!isSelected && selectedFlavors.length < 2) {
      setSelectedFlavors(prev => [...prev, f]);
    }
  };

  const addPizzaToOrder = () => {
    const price = calculatePizzaPrice();
    const flavorNames = selectedFlavors.map(f => f.name).join(' / ');
    
    // Formatar nome das bordas
    let borderText = '';
    if (selectedBorders.length > 0) {
      const borderNames = selectedBorders.map(b => b.name).join(' + ');
      borderText = ` + Bordas: ${borderNames}`;
    }
    
    const name = `Pizza ${sizeLabels[selectedSize]} - ${flavorNames}${borderText}`;

    setItems(prev => [...prev, {
      id: `pizza-${Date.now()}`,
      name,
      price,
      quantity: 1,
      type: 'pizza',
      observation: pizzaObservation || undefined,
    }]);
    toast.success('Pizza adicionada!');
    setPizzaModal(false);
  };

  // Product handlers
  const addProduct = (product: { id: string; name: string; price: number }) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, type: 'product' as const }];
    });
  };

  const addDrinkVariant = (product: typeof products[0], variant: typeof allVariants[0]) => {
    const id = `${product.id}-${variant.id}`;
    const name = `${product.name} ${variant.size_label}`;
    setItems(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id, name, price: Number(variant.price), quantity: 1, type: 'product' as const }];
    });
    toast.success(`${name} adicionado!`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev
      .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (!tableNumber.trim()) { toast.error('Informe o número da mesa'); return; }
    if (items.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    setSubmitting(true);
    try {
      const orderItems = items.map(i => ({
        type: i.type,
        id: i.id,
        product: { id: i.id, name: i.name, price: i.price, description: '', category: '', available: true },
        quantity: i.quantity,
        unitPrice: i.price,
        name: i.name,
        observation: i.observation,
      }));

      const { error } = await supabase.from('orders').insert({
        customer_name: customerName.trim() || `Mesa ${tableNumber}`,
        customer_phone: '',
        customer_address: `Mesa ${tableNumber}`,
        items: orderItems as any,
        payment_method: 'cash' as any,
        total,
        status: 'CONFIRMED',
        order_type: 'local' as any,
        table_number: tableNumber,
        created_by: user?.id || null,
      });

      if (error) throw error;

      toast.success(`✅ Pedido da Mesa ${tableNumber} registrado!`);
      setItems([]);
      setTableNumber('');
      setCustomerName('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const validateSplitPayments = () => {
    if (!paymentOrder) return false;
    
    const totalSplit = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    
    if (Math.abs(totalSplit - paymentOrder.total) > 0.01) {
      setSplitError(`A soma dos valores (R$ ${totalSplit.toFixed(2)}) é diferente do total (R$ ${paymentOrder.total.toFixed(2)})`);
      return false;
    }

    if (splitPayments.some(p => p.amount < 0)) {
      setSplitError('Os valores não podem ser negativos');
      return false;
    }

    setSplitError('');
    return true;
  };

  const handleSplitAmountChange = (index: number, value: string) => {
    const newAmount = parseFloat(value) || 0;
    setSplitPayments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amount: newAmount };
      return updated;
    });
    
    setTimeout(() => validateSplitPayments(), 100);
  };

  const handleSplitPayment = async () => {
    if (!paymentOrder) return;

    if (!validateSplitPayments()) {
      toast.error(splitError || 'Valores inválidos');
      return;
    }

    setProcessingPayment(true);
    try {
      // Criar objeto de payment_data
      const paymentData = {
        method: 'split',
        splitPayments: splitPayments
      };

      const { error } = await supabase
        .from('orders')
        .update({
          status: 'DELIVERED',
          payment_method: 'cash',
          payment_data: paymentData
        })
        .eq('id', paymentOrder.id);

      if (error) throw error;

      toast.success(`🎉 Mesa ${paymentOrder.tableNumber} — Pagamento dividido finalizado!`);
      setPaymentOrder(null);
      setSplitPayments([
        { method: 'cash', amount: 0 },
        { method: 'card', amount: 0 },
      ]);
      setSplitError('');
    } catch (error) {
      console.error('Erro no split payment:', error);
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFinishPayment = async () => {
    if (!paymentOrder) return;

    if (paymentMethod === 'split') {
      await handleSplitPayment();
      return;
    }

    if (paymentMethod === 'cash' && needsChange && (!changeFor || Number(changeFor) <= paymentOrder.total)) {
      toast.error('O valor do troco deve ser maior que o total.');
      return;
    }

    setProcessingPayment(true);
    try {
      const updateData: any = { 
        status: 'DELIVERED', 
        payment_method: paymentMethod 
      };

      if (paymentMethod === 'cash' && needsChange) {
        updateData.needs_change = true;
        updateData.change_for = Number(changeFor);
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', paymentOrder.id);

      if (error) throw error;

      toast.success(`🎉 Mesa ${paymentOrder.tableNumber} — Pagamento finalizado!`);
      setPaymentOrder(null);
      setNeedsChange(false);
      setChangeFor('');
    } catch {
      toast.error('Erro ao finalizar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePixPayment = async (order: PendingLocalOrder) => {
    setPixLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pix', {
        body: { 
          orderId: order.id, 
          amount: order.total, 
          customerName: order.customerName || `Mesa ${order.tableNumber}`
        },
      });

      if (error) throw new Error(error.message || 'Erro ao gerar PIX');

      if (!data?.pixCode) {
        throw new Error('PIX code não recebido');
      }

      setPixCode(data.pixCode);
      setShowPixModal(true);
      
    } catch (error: any) {
      console.error('Erro PIX:', error);
      toast.error(error.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setPixLoading(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código PIX copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-500' },
    PREPARING: { label: 'Preparando', color: 'bg-orange-500' },
    READY: { label: 'Pronto', color: 'bg-green-500' },
  };

  const loading = isLoadingFlavors || isLoadingProducts;
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="novo">
        <TabsList className="w-full">
          <TabsTrigger value="novo" className="flex-1">
            <Plus className="w-4 h-4 mr-2" /> Novo Pedido
          </TabsTrigger>
          <TabsTrigger value="mesas" className="flex-1">
            <Clock className="w-4 h-4 mr-2" /> Mesas Abertas
            {pendingOrders.length > 0 && (
              <Badge className="ml-2 bg-destructive text-destructive-foreground text-[10px] h-4 px-1">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === TAB: NOVO PEDIDO === */}
        <TabsContent value="novo" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mesa *</Label>
              <Input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder="Nº da mesa" className="mt-1" />
            </div>
            <div>
              <Label>Nome do Cliente</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Opcional" className="mt-1" />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no cardápio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Menu tabs */}
          <div className="flex gap-2 mb-2">
            <Button
              variant={menuTab === 'pizzas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMenuTab('pizzas')}
            >
              🍕 Pizzas
            </Button>
            <Button
              variant={menuTab === 'bebidas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMenuTab('bebidas')}
            >
              🥤 Bebidas
            </Button>
          </div>

          {/* Pizzas */}
          {menuTab === 'pizzas' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pizzas</CardTitle>
                {/* Category filters */}
                {pizzaCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button
                      variant={selectedPizzaCategory === null ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs rounded-full"
                      onClick={() => setSelectedPizzaCategory(null)}
                    >
                      Todas
                    </Button>
                    {pizzaCategories.map(cat => (
                      <Button
                        key={cat.id}
                        variant={selectedPizzaCategory === cat.id ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs rounded-full"
                        onClick={() => setSelectedPizzaCategory(selectedPizzaCategory === cat.id ? null : cat.id)}
                      >
                        {cat.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {flavorsByCategory.length > 0 ? (
                  <div className="space-y-4">
                    {flavorsByCategory.map(group => (
                      <div key={group.id || 'other'}>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 border-l-2 border-primary pl-2">
                          {group.name}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {group.items.map(flavor => (
                            <Button
                              key={flavor.id}
                              variant="outline"
                              className="h-auto py-2 px-3 text-left flex-col items-start"
                              onClick={() => openPizzaModal(flavor)}
                            >
                              <span className="text-xs font-medium truncate w-full">{flavor.name}</span>
                              <span className="text-[10px] text-muted-foreground truncate w-full">
                                {flavor.ingredients.slice(0, 3).join(', ')}
                              </span>
                              <span className="text-xs text-primary font-bold">a partir R$ {flavor.prices.P.toFixed(2)}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma pizza encontrada</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bebidas */}
          {menuTab === 'bebidas' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bebidas</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Size selector for drinks with variants */}
                {drinkSizes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2">Escolha o tamanho:</p>
                    <div className="flex flex-wrap gap-2">
                      {drinkSizes.map(size => (
                        <Button
                          key={size}
                          variant={selectedDrinkSize === size ? 'default' : 'outline'}
                          size="sm"
                          className="rounded-full"
                          onClick={() => setSelectedDrinkSize(selectedDrinkSize === size ? null : size)}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDrinkSize && drinksForSize.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Bebidas — {selectedDrinkSize}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {drinksForSize.map(({ product, variant }) => (
                        <Button
                          key={variant.id}
                          variant="outline"
                          className="h-auto py-2 px-3 text-left flex-col items-start"
                          onClick={() => addDrinkVariant(product, variant)}
                        >
                          <span className="text-xs font-medium truncate w-full">{product.name}</span>
                          <span className="text-[10px] text-muted-foreground">{variant.size_label}</span>
                          <span className="text-xs text-primary font-bold">R$ {Number(variant.price).toFixed(2)}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products without variants */}
                {productsWithoutVariants.length > 0 && !selectedDrinkSize && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {productsWithoutVariants.map(product => (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="h-auto py-2 px-3 text-left flex-col items-start"
                        onClick={() => addProduct({ id: product.id, name: product.name, price: product.price })}
                      >
                        <span className="text-xs font-medium truncate w-full">{product.name}</span>
                        <span className="text-xs text-primary font-bold">R$ {product.price.toFixed(2)}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order items */}
          {items.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.observation && (
                        <p className="text-xs text-muted-foreground italic">📝 {item.observation}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        R$ {item.price.toFixed(2)} × {item.quantity} = <span className="font-bold text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="font-bold text-lg">Total: R$ {total.toFixed(2)}</span>
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Registrar Pedido
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* === TAB: MESAS ABERTAS === */}
        <TabsContent value="mesas" className="mt-4 space-y-3">
          {loadingPending ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-secondary" />
                <p className="text-muted-foreground">Nenhuma mesa aberta</p>
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map(order => {
              const statusInfo = statusLabels[order.status] || { label: order.status, color: 'bg-gray-500' };
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg">Mesa {order.tableNumber}</span>
                          <Badge className={`${statusInfo.color} text-white text-xs`}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{order.items.length} itens
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary text-xl">R$ {order.total.toFixed(2)}</p>
                        <Button
                          size="sm"
                          className="mt-2 gap-1"
                          onClick={() => { 
                            setPaymentOrder(order); 
                            setPaymentMethod('cash'); 
                            setNeedsChange(false); 
                            setChangeFor('');
                            setSplitPayments([
                              { method: 'cash', amount: 0 },
                              { method: 'card', amount: 0 },
                            ]);
                            setSplitError('');
                          }}
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Pagar
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {order.items.map((item: any, idx: number) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {item.quantity}× {item.product?.name || item.name}
                          {item.observation && <span className="italic ml-1">📝 {item.observation}</span>}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Pizza Configuration Modal - ATUALIZADO */}
      <Dialog open={pizzaModal} onOpenChange={setPizzaModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monte a Pizza — {selectedFlavor?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Size */}
            <div>
              <h4 className="font-medium mb-2">Tamanho</h4>
              <RadioGroup value={selectedSize} onValueChange={(v) => setSelectedSize(v as PizzaSize)} className="grid grid-cols-4 gap-2">
                {(['P', 'M', 'G', 'GG'] as PizzaSize[]).map((size) => (
                  <div key={size}>
                    <RadioGroupItem value={size} id={`emp-size-${size}`} className="peer sr-only" />
                    <Label htmlFor={`emp-size-${size}`} className="flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5">
                      <span className="font-semibold">{size}</span>
                      <span className="text-xs text-muted-foreground">{sizeLabels[size]}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Flavor count */}
            <div>
              <h4 className="font-medium mb-2">Quantidade de Sabores</h4>
              <div className="flex gap-2">
                <Button variant={flavorCount === 1 ? 'default' : 'outline'} onClick={() => { setFlavorCount(1); setSelectedFlavors(selectedFlavor ? [selectedFlavor] : []); }} className="flex-1">1 Sabor</Button>
                <Button variant={flavorCount === 2 ? 'default' : 'outline'} onClick={() => setFlavorCount(2)} className="flex-1">2 Sabores</Button>
              </div>
            </div>

            {/* Second flavor */}
            {flavorCount === 2 && (
              <div>
                <h4 className="font-medium mb-2">Selecione os Sabores ({selectedFlavors.length}/2)</h4>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {flavors.map(f => {
                    const isSelected = selectedFlavors.some(sf => sf.id === f.id);
                    return (
                      <button key={f.id} onClick={() => toggleSecondFlavor(f)} className={`p-2 border rounded-lg text-left transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                            <span className="font-medium text-sm">{f.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">R$ {(f.prices[selectedSize] / 2).toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Border - MÚLTIPLAS BORDAS */}
            <div>
              <h4 className="font-medium mb-2">Borda Recheada</h4>
              <div className="flex gap-2 mb-2">
                <Button 
                  variant={!hasBorder ? 'default' : 'outline'} 
                  onClick={() => { 
                    setHasBorder(false); 
                    setSelectedBorders([]); 
                  }} 
                  className="flex-1"
                >
                  Sem borda
                </Button>
                <Button 
                  variant={hasBorder ? 'default' : 'outline'} 
                  onClick={() => setHasBorder(true)} 
                  className="flex-1"
                >
                  Com borda
                </Button>
              </div>

              {hasBorder && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Selecione até 2 sabores de borda:</p>
                  <div className="grid gap-2">
                    {borders.map(border => {
                      const selected = selectedBorders.some(b => b.id === border.id);
                      const disabled = selectedBorders.length >= 2 && !selected;
                      
                      return (
                        <button
                          key={border.id}
                          onClick={() => {
                            if (selected) {
                              setSelectedBorders(prev => prev.filter(b => b.id !== border.id));
                            } else if (selectedBorders.length < 2) {
                              setSelectedBorders(prev => [...prev, border]);
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
                          <span>+ R$ {border.prices?.[selectedSize]?.toFixed(2) || border.price?.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedBorders.length > 0 && (
                    <p className="text-sm text-right text-primary font-medium mt-2">
                      Total borda: + R$ {calculateBorderTotal().toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Observação */}
            <div>
              <h4 className="font-medium mb-2">Observação (opcional)</h4>
              <textarea
                placeholder="Ex: tirar cebola, bem passada, etc..."
                value={pizzaObservation}
                onChange={(e) => setPizzaObservation(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={2}
              />
            </div>

            {/* Total & Add */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">Total:</span>
                <span className="text-2xl font-bold text-primary">R$ {calculatePizzaPrice().toFixed(2)}</span>
              </div>
              <Button 
                onClick={addPizzaToOrder} 
                className="w-full" 
                size="lg" 
                disabled={flavorCount === 2 && selectedFlavors.length < 2}
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar ao Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog - COM SPLIT PAYMENT */}
      <Dialog open={!!paymentOrder} onOpenChange={(open) => !open && setPaymentOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagamento — Mesa {paymentOrder?.tableNumber}</DialogTitle>
          </DialogHeader>

          {paymentOrder && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                {paymentOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.product?.name || item.name}</span>
                    <span className="font-medium">R$ {((item.unitPrice || item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-primary">R$ {paymentOrder.total.toFixed(2)}</span>
              </div>

              <div>
                <Label className="mb-2 block">Forma de Pagamento</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'cash', label: '💵 Dinheiro' },
                    { value: 'card', label: '💳 Cartão' },
                    { value: 'pix', label: '📱 PIX' },
                    { value: 'split', label: '🔄 Dividir' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setPaymentMethod(opt.value as any);
                        setNeedsChange(false);
                        setChangeFor('');
                        
                        if (opt.value === 'pix' && paymentOrder) {
                          handlePixPayment(paymentOrder);
                        }
                      }}
                      className={`p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        paymentMethod === opt.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CAMPO DE TROCO PARA DINHEIRO */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="needsChange"
                      checked={needsChange}
                      onChange={(e) => setNeedsChange(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="needsChange" className="text-sm font-medium">
                      Precisa de troco?
                    </Label>
                  </div>

                  {needsChange && (
                    <div className="space-y-2">
                      <Label htmlFor="changeFor" className="text-sm">Troco para quanto?</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          id="changeFor"
                          type="number"
                          min={paymentOrder.total + 1}
                          step="0.01"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          placeholder="0,00"
                          className="pl-8"
                        />
                      </div>
                      {changeFor && (
                        <p className="text-sm text-muted-foreground">
                          Troco: <span className="text-green-600 font-medium">R$ {(Number(changeFor) - paymentOrder.total).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* INTERFACE DE SPLIT PAYMENT */}
              {paymentMethod === 'split' && (
                <div className="space-y-4 border-t pt-3">
                  <p className="text-sm font-medium">Divida o pagamento:</p>
                  
                  {splitPayments.map((payment, index) => (
                    <div key={index} className="space-y-2 p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {payment.method === 'cash' ? (
                            <Banknote className="w-4 h-4 text-green-600" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-blue-600" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {payment.method === 'cash' ? 'Dinheiro' : 'Cartão'}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {index === 0 ? '1ª forma' : '2ª forma'}
                        </Badge>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          max={paymentOrder.total}
                          step="0.01"
                          value={payment.amount || ''}
                          onChange={(e) => handleSplitAmountChange(index, e.target.value)}
                          placeholder="0,00"
                          className="pl-8"
                        />
                      </div>
                    </div>
                  ))}

                  {splitError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {splitError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-lg">
                    <span className="font-medium">Total distribuído:</span>
                    <span className={`font-bold ${
                      Math.abs(splitPayments.reduce((sum, p) => sum + p.amount, 0) - paymentOrder.total) < 0.01
                        ? 'text-green-600'
                        : 'text-destructive'
                    }`}>
                      R$ {splitPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A soma dos valores deve ser igual ao total do pedido.
                  </p>
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                onClick={handleFinishPayment} 
                disabled={
                  processingPayment || 
                  (paymentMethod === 'pix') ||
                  (paymentMethod === 'split' && splitError !== '')
                }
              >
                {processingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {paymentMethod === 'pix' ? 'Aguardando PIX...' : 'Finalizar & Fechar Mesa'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal PIX */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
              <DialogHeader className="p-0">
                <DialogTitle className="text-xl text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6" />
                  Pagamento PIX - Mesa {paymentOrder?.tableNumber}
                </DialogTitle>
                <DialogDescription className="text-white/80">
                  Escaneie o QR Code ou copie o código PIX
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
              <Clock className="w-3 h-3 inline mr-1" />
              {formatTime(timeLeft)}
            </div>

            <div className="p-6">
              {pixLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Gerando código PIX...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-2xl shadow-xl">
                      <QRCodeSVG value={pixCode} size={220} />
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mesa</span>
                      <span className="font-medium">{paymentOrder?.tableNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-bold text-primary">R$ {paymentOrder?.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Código PIX (copia e cola)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={pixCode}
                        readOnly
                        className="font-mono text-xs bg-muted/30"
                      />
                      <Button
                        size="icon"
                        variant={copied ? "default" : "outline"}
                        onClick={copyPixCode}
                        className="shrink-0 transition-all"
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-sm text-center text-muted-foreground">
                      Após o pagamento, o pedido será atualizado automaticamente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewLocalOrder;