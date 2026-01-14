import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { PizzeriaSettings, PizzaFlavor, PizzaBorder, PizzaSizeOption, Product, Order } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Default pizza sizes
const defaultSizes: PizzaSizeOption[] = [
  { id: 'size-p', name: 'Pequena', size: 'P', price: 0 },
  { id: 'size-m', name: 'Média', size: 'M', price: 0 },
  { id: 'size-g', name: 'Grande', size: 'G', price: 0 },
  { id: 'size-gg', name: 'Gigante', size: 'GG', price: 0 },
];

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
  refetchFlavors: () => void;
  refetchProducts: () => void;
  refetchBorders: () => void;
  refetchSettings: () => void;
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
  // Fetch settings from database
  const { data: settingsData, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['pizzeria-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizzeria_settings')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch pizza flavors from database
  const { data: flavorsData, isLoading: isLoadingFlavors, refetch: refetchFlavors } = useQuery({
    queryKey: ['pizza-flavors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pizza_flavors')
        .select('*')
        .eq('available', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch pizza borders from database
  const { data: bordersData, isLoading: isLoadingBorders, refetch: refetchBorders } = useQuery({
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

  // Fetch products from database
  const { data: productsData, isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
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

  // Transform database data to app types
  const settings: PizzeriaSettings = settingsData ? {
    name: settingsData.name,
    logo: settingsData.logo_url || undefined,
    isOpen: settingsData.is_open,
    whatsapp: settingsData.whatsapp,
    address: settingsData.address,
    primaryColor: settingsData.primary_color,
    secondaryColor: settingsData.secondary_color,
    accentColor: settingsData.accent_color,
  } : {
    name: 'Pizzaria Italiana',
    isOpen: true,
    whatsapp: '',
    address: '',
    primaryColor: '#c41e3a',
    secondaryColor: '#228b22',
    accentColor: '#ffffff',
  };

  const flavors: PizzaFlavor[] = flavorsData?.map(f => ({
    id: f.id,
    name: f.name,
    description: f.description || '',
    ingredients: f.ingredients || [],
    image: f.image_url || undefined,
    prices: {
      P: Number(f.price_p),
      M: Number(f.price_m),
      G: Number(f.price_g),
      GG: Number(f.price_gg),
    },
  })) || [];

  const borders: PizzaBorder[] = bordersData?.map(b => ({
    id: b.id,
    name: b.name,
    price: Number(b.price),
  })) || [];

  const products: Product[] = productsData?.map(p => ({
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
        refetchFlavors,
        refetchProducts,
        refetchBorders,
        refetchSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};
