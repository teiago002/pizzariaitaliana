import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PizzeriaSettings } from '@/types';
import { toast } from 'sonner';

interface DbSettings {
  id: string;
  name: string;
  logo_url: string | null;
  whatsapp: string;
  address: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  pix_key: string | null;
  pix_name: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToSettings = (db: DbSettings): PizzeriaSettings & { id: string; pixKey?: string; pixName?: string } => ({
  id: db.id,
  name: db.name,
  logo: db.logo_url || undefined,
  whatsapp: db.whatsapp,
  address: db.address,
  primaryColor: db.primary_color,
  secondaryColor: db.secondary_color,
  accentColor: db.accent_color,
  pixKey: db.pix_key || undefined,
  pixName: db.pix_name || undefined,
});

export function useSettings() {
  const [settings, setSettings] = useState<PizzeriaSettings & { id?: string; pixKey?: string; pixName?: string }>({
    name: 'Pizzaria Italiana',
    whatsapp: '(89) 98134-7052',
    address: 'Av. Manoel Bezerra | Nº 189 | Centro',
    primaryColor: '#C41E3A',
    secondaryColor: '#228B22',
    accentColor: '#FFFFFF',
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pizzeria_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(mapDbToSettings(data as DbSettings));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<PizzeriaSettings & { pixKey?: string; pixName?: string }>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.logo !== undefined) dbUpdates.logo_url = updates.logo;
      if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
      if (updates.secondaryColor !== undefined) dbUpdates.secondary_color = updates.secondaryColor;
      if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor;
      if (updates.pixKey !== undefined) dbUpdates.pix_key = updates.pixKey;
      if (updates.pixName !== undefined) dbUpdates.pix_name = updates.pixName;

      if (settings.id) {
        const { error } = await supabase
          .from('pizzeria_settings')
          .update(dbUpdates)
          .eq('id', settings.id);

        if (error) throw error;
      }

      setSettings(prev => ({ ...prev, ...updates }));
      toast.success('Configurações salvas');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload do logo');
      return null;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
}