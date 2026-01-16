// Types for the Pizzeria System

export type PizzaSize = 'P' | 'M' | 'G' | 'GG';

export interface PizzaSizeOption {
  id: string;
  name: string;
  size: PizzaSize;
  price: number;
}

export interface PizzaFlavor {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  image?: string;
  prices: {
    P: number;
    M: number;
    G: number;
    GG: number;
  };
}

export interface PizzaBorder {
  id: string;
  name: string;
  price: number;
  prices?: {
    P: number;
    M: number;
    G: number;
    GG: number;
  };
}

export interface Pizza {
  id: string;
  name: string;
  category: string;
  flavors: PizzaFlavor[];
  sizes: PizzaSizeOption[];
  borders: PizzaBorder[];
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
}

export type PaymentMethod = 'pix' | 'cash' | 'card';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface CartItemPizza {
  type: 'pizza';
  id: string;
  size: PizzaSize;
  flavors: PizzaFlavor[];
  border?: PizzaBorder;
  quantity: number;
  unitPrice: number;
}

export interface CartItemProduct {
  type: 'product';
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export type CartItem = CartItemPizza | CartItemProduct;

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  complement?: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  needsChange?: boolean;
  changeFor?: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  customer: CustomerInfo;
  payment: PaymentInfo;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PizzeriaSettings {
  name: string;
  logo?: string;
  isOpen: boolean;
  whatsapp: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}
