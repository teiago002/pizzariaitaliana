import React, { createContext, useContext, ReactNode } from 'react';
import { PizzeriaSettings, PizzaFlavor, PizzaBorder, PizzaSizeOption, Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/* -----------------------------
   Tipos do banco (reais)
-------------------------------- */

type SettingsRow = {
  name: string;
  logo_url: string | null;
  whatsapp: string;
  address: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  is_open: boolean;
};

/* -----------------------------
   Default pizza sizes
-------------------------------- */

const defaultSizes: PizzaSizeOption[] = [
  { id: 'size-p', name: 'Pequena', size: 'P', price: 0 },
  { id: 'size-m', name: 'Média', size: 'M', price: 0 },
  { id: 'size-g', name: 'Grande', size: 'G', price: 0 },
  { id: 'size-gg', name: 'Gigante', size: 'GG', price: 0 },
];

/* -----------------------------
   Context
-------------------------------- */

interface StoreContextType {
  settings: PizzeriaSettings;
  isLoadingSettings: boolean;

  flavors: PizzaFlavor[];
  isLoadingFlavors: boolean;

  borders: PizzaBorder[];
  isLoadingBorders: boolean;

  sizes: PizzaSizeOption[];

  products: Product[];
  isLoadingProducts: boolean;

  refetchSettings: () => void;
  refetchFlavors: () => void;
  refetchBorders: () => void;
  refetchProducts: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

/* -----------------------------
   Provider
-------------------------------- */

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  /* -------- SETTINGS -------- */
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    refetch: refetchSettings,
  } = useQuery<SettingsRow | null>({
    queryKey: ['pizzeria-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizzeria_settings')
        .select(`
          name,
          logo_url,
          whatsapp,
          address,
          primary_color,
          secondary_color,
          accent_color,
          is_open
        `)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  /* -------- FLAVORS -------- */
  const {
    data: flavorsData,
    isLoading: isLoadingFlavors,
    refetch: refetchFlavors,
  } = useQuery({
    queryKey: ['pizza-flavors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_flavors')
        .select('*, pizza_categories(id, name)')
        .eq('available', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  /* -------- BORDERS -------- */
  const {
    data: bordersData,
    isLoading: isLoadingBorders,
    refetch: refetchBorders,
  } = useQuery({
    queryKey: ['pizza-borders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_borders')
        .select('*')
        .eq('available', true)
        .order('price');

      if (error) throw error;
      return data;
    },
  });

  /* -------- PRODUCTS -------- */
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  /* -----------------------------
     Transformações
  -------------------------------- */

  const settings: PizzeriaSettings = settingsData
    ? {
        name: settingsData.name,
        logo: settingsData.logo_url || undefined,
        whatsapp: settingsData.whatsapp,
        address: settingsData.address,
        primaryColor: settingsData.primary_color,
        secondaryColor: settingsData.secondary_color,
        accentColor: settingsData.accent_color,
        isOpen: settingsData.is_open,
      }
    : {
        name: 'Pizzaria Italiana',
        whatsapp: '',
        address: '',
        primaryColor: '#c41e3a',
        secondaryColor: '#228b22',
        accentColor: '#ffffff',
        isOpen: false,
      };

  const flavors: PizzaFlavor[] =
    flavorsData?.map((f: any) => ({
      id: f.id,
      name: f.name,
      description: f.description || '',
      ingredients: f.ingredients || [],
      image: f.image_url || undefined,
      categoryId: f.category_id || undefined,
      categoryName: f.pizza_categories?.name,
      prices: {
        P: Number(f.price_p),
        M: Number(f.price_m),
        G: Number(f.price_g),
        GG: Number(f.price_gg),
      },
    })) || [];

  const borders: PizzaBorder[] =
    bordersData?.map((b: any) => ({
      id: b.id,
      name: b.name,
      price: Number(b.price),
      prices: {
        P: Number(b.price_p || b.price * 0.6),
        M: Number(b.price_m || b.price * 0.8),
        G: Number(b.price_g || b.price),
        GG: Number(b.price_gg || b.price * 1.2),
      },
    })) || [];

  const products: Product[] =
    productsData?.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      category: p.category,
      image: p.image_url || undefined,
      available: p.available,
    })) || [];

  return (
    <StoreContext.Provider
      value={{
        settings,
        isLoadingSettings,
        flavors,
        isLoadingFlavors,
        borders,
        isLoadingBorders,
        sizes: defaultSizes,
        products,
        isLoadingProducts,
        refetchSettings,
        refetchFlavors,
        refetchBorders,
        refetchProducts,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};