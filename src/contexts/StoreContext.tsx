import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PizzeriaSettings, PizzaFlavor, PizzaBorder, PizzaSizeOption, Product, Order } from '@/types';

import pizzaMargherita from '@/assets/pizza-margherita.jpg';
import pizzaPepperoni from '@/assets/pizza-pepperoni.jpg';
import pizzaQuattro from '@/assets/pizza-quattro.jpg';
import pizzaPortuguesa from '@/assets/pizza-portuguesa.jpg';

// Default settings
const defaultSettings: PizzeriaSettings = {
  name: 'Pizzaria Italiana',
  isOpen: true,
  whatsapp: '(89) 98134-7052',
  address: 'Av. Manoel Bezerra | Nº 189 | Centro',
  primaryColor: '#c41e3a',
  secondaryColor: '#228b22',
  accentColor: '#ffffff',
};

// Default pizza sizes
const defaultSizes: PizzaSizeOption[] = [
  { id: 'size-p', name: 'Pequena', size: 'P', price: 0 },
  { id: 'size-m', name: 'Média', size: 'M', price: 0 },
  { id: 'size-g', name: 'Grande', size: 'G', price: 0 },
  { id: 'size-gg', name: 'Gigante', size: 'GG', price: 0 },
];

// Default pizza flavors
const defaultFlavors: PizzaFlavor[] = [
  {
    id: 'flavor-margherita',
    name: 'Margherita',
    description: 'Clássica italiana com molho de tomate fresco',
    ingredients: ['Molho de tomate', 'Mussarela', 'Manjericão fresco', 'Azeite'],
    image: pizzaMargherita,
    prices: { P: 32, M: 42, G: 52, GG: 62 },
  },
  {
    id: 'flavor-pepperoni',
    name: 'Pepperoni',
    description: 'Sabor intenso com pepperoni artesanal',
    ingredients: ['Molho de tomate', 'Mussarela', 'Pepperoni', 'Orégano'],
    image: pizzaPepperoni,
    prices: { P: 38, M: 48, G: 58, GG: 68 },
  },
  {
    id: 'flavor-quattro',
    name: 'Quatro Queijos',
    description: 'Combinação perfeita de queijos selecionados',
    ingredients: ['Mussarela', 'Gorgonzola', 'Parmesão', 'Catupiry'],
    image: pizzaQuattro,
    prices: { P: 40, M: 50, G: 60, GG: 70 },
  },
  {
    id: 'flavor-portuguesa',
    name: 'Portuguesa',
    description: 'Tradicional com ovos e presunto',
    ingredients: ['Molho de tomate', 'Mussarela', 'Presunto', 'Ovos', 'Cebola', 'Azeitonas', 'Ervilha'],
    image: pizzaPortuguesa,
    prices: { P: 36, M: 46, G: 56, GG: 66 },
  },
];

// Default borders
const defaultBorders: PizzaBorder[] = [
  { id: 'border-none', name: 'Sem borda recheada', price: 0 },
  { id: 'border-catupiry', name: 'Catupiry', price: 8 },
  { id: 'border-cheddar', name: 'Cheddar', price: 8 },
  { id: 'border-chocolate', name: 'Chocolate', price: 10 },
];

// Default products (drinks, etc)
const defaultProducts: Product[] = [
  { id: 'prod-1', name: 'Coca-Cola 2L', description: 'Refrigerante Coca-Cola', price: 12, category: 'Bebidas', available: true },
  { id: 'prod-2', name: 'Guaraná 2L', description: 'Refrigerante Guaraná Antarctica', price: 10, category: 'Bebidas', available: true },
  { id: 'prod-3', name: 'Suco Natural 500ml', description: 'Suco de laranja natural', price: 8, category: 'Bebidas', available: true },
  { id: 'prod-4', name: 'Água Mineral 500ml', description: 'Água mineral sem gás', price: 4, category: 'Bebidas', available: true },
];

interface StoreContextType {
  settings: PizzeriaSettings;
  updateSettings: (settings: Partial<PizzeriaSettings>) => void;
  flavors: PizzaFlavor[];
  setFlavors: (flavors: PizzaFlavor[]) => void;
  addFlavor: (flavor: PizzaFlavor) => void;
  updateFlavor: (id: string, flavor: Partial<PizzaFlavor>) => void;
  removeFlavor: (id: string) => void;
  borders: PizzaBorder[];
  setBorders: (borders: PizzaBorder[]) => void;
  addBorder: (border: PizzaBorder) => void;
  updateBorder: (id: string, border: Partial<PizzaBorder>) => void;
  removeBorder: (id: string) => void;
  sizes: PizzaSizeOption[];
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PizzeriaSettings>(defaultSettings);
  const [flavors, setFlavors] = useState<PizzaFlavor[]>(defaultFlavors);
  const [borders, setBorders] = useState<PizzaBorder[]>(defaultBorders);
  const [sizes] = useState<PizzaSizeOption[]>(defaultSizes);
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [orders, setOrders] = useState<Order[]>([]);

  const updateSettings = (newSettings: Partial<PizzeriaSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addFlavor = (flavor: PizzaFlavor) => {
    setFlavors(prev => [...prev, flavor]);
  };

  const updateFlavor = (id: string, flavorUpdate: Partial<PizzaFlavor>) => {
    setFlavors(prev => prev.map(f => f.id === id ? { ...f, ...flavorUpdate } : f));
  };

  const removeFlavor = (id: string) => {
    setFlavors(prev => prev.filter(f => f.id !== id));
  };

  const addBorder = (border: PizzaBorder) => {
    setBorders(prev => [...prev, border]);
  };

  const updateBorder = (id: string, borderUpdate: Partial<PizzaBorder>) => {
    setBorders(prev => prev.map(b => b.id === id ? { ...b, ...borderUpdate } : b));
  };

  const removeBorder = (id: string) => {
    setBorders(prev => prev.filter(b => b.id !== id));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const updateProduct = (id: string, productUpdate: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...productUpdate } : p));
  };

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: new Date() } : o));
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        updateSettings,
        flavors,
        setFlavors,
        addFlavor,
        updateFlavor,
        removeFlavor,
        borders,
        setBorders,
        addBorder,
        updateBorder,
        removeBorder,
        sizes,
        products,
        setProducts,
        addProduct,
        updateProduct,
        removeProduct,
        orders,
        addOrder,
        updateOrderStatus,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
