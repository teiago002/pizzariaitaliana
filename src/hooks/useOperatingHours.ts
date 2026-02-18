import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OperatingHour {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface SpecialClosure {
  id: string;
  closureDate: string;
  reason: string | null;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function useOperatingHours() {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [closures, setClosures] = useState<SpecialClosure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [hoursRes, closuresRes] = await Promise.all([
        supabase.from('operating_hours').select('*').order('day_of_week'),
        supabase.from('special_closures').select('*').order('closure_date'),
      ]);

      if (hoursRes.error) throw hoursRes.error;
      if (closuresRes.error) throw closuresRes.error;

      setHours(
        (hoursRes.data || []).map((h: any) => ({
          id: h.id,
          dayOfWeek: h.day_of_week,
          openTime: h.open_time,
          closeTime: h.close_time,
          isOpen: h.is_open,
        }))
      );

      setClosures(
        (closuresRes.data || []).map((c: any) => ({
          id: c.id,
          closureDate: c.closure_date,
          reason: c.reason,
        }))
      );
    } catch (error) {
      console.error('Error fetching operating hours:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateHour = async (id: string, updates: Partial<{ openTime: string; closeTime: string; isOpen: boolean }>) => {
    try {
      const dbUpdates: any = {};
      if (updates.openTime !== undefined) dbUpdates.open_time = updates.openTime;
      if (updates.closeTime !== undefined) dbUpdates.close_time = updates.closeTime;
      if (updates.isOpen !== undefined) dbUpdates.is_open = updates.isOpen;

      const { error } = await supabase.from('operating_hours').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setHours(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
      toast.success('Horário atualizado');
    } catch (error) {
      console.error('Error updating hour:', error);
      toast.error('Erro ao atualizar horário');
    }
  };

  const addClosure = async (date: string, reason?: string) => {
    try {
      const { data, error } = await supabase
        .from('special_closures')
        .insert({ closure_date: date, reason: reason || null })
        .select()
        .single();

      if (error) throw error;

      setClosures(prev => [...prev, { id: data.id, closureDate: data.closure_date, reason: data.reason }]);
      toast.success('Data de fechamento adicionada');
    } catch (error) {
      console.error('Error adding closure:', error);
      toast.error('Erro ao adicionar data de fechamento');
    }
  };

  const removeClosure = async (id: string) => {
    try {
      const { error } = await supabase.from('special_closures').delete().eq('id', id);
      if (error) throw error;

      setClosures(prev => prev.filter(c => c.id !== id));
      toast.success('Data de fechamento removida');
    } catch (error) {
      console.error('Error removing closure:', error);
      toast.error('Erro ao remover data de fechamento');
    }
  };

  const isCurrentlyOpen = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check special closures
    if (closures.some(c => c.closureDate === todayStr)) return false;

    const dayOfWeek = now.getDay();
    const todayHours = hours.find(h => h.dayOfWeek === dayOfWeek);
    if (!todayHours || !todayHours.isOpen) return false;

    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }, [hours, closures]);

  return { hours, closures, loading, updateHour, addClosure, removeClosure, isCurrentlyOpen, dayNames: DAY_NAMES, refetch: fetchAll };
}
