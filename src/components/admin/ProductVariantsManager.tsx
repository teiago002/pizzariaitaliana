import React, { useState } from 'react';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProductVariant {
  id: string;
  product_id: string;
  size_label: string;
  price: number;
  available: boolean;
}

interface ProductVariantsManagerProps {
  productId: string;
  productName: string;
}

const ProductVariantsManager: React.FC<ProductVariantsManagerProps> = ({ productId, productName }) => {
  const queryClient = useQueryClient();
  const [newVariant, setNewVariant] = useState({ size_label: '', price: 0, available: true });
  const [addingNew, setAddingNew] = useState(false);

  const { data: variants = [], isLoading } = useQuery<ProductVariant[]>({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('price');
      if (error) throw error;
      return data as ProductVariant[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (v: typeof newVariant) => {
      if (!v.size_label.trim()) throw new Error('Informe o tamanho (ex: 350ml, 2L)');
      const { error } = await supabase.from('product_variants').insert({
        product_id: productId,
        size_label: v.size_label.trim(),
        price: v.price,
        available: v.available,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Tamanho adicionado!');
      setNewVariant({ size_label: '', price: 0, available: true });
      setAddingNew(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao adicionar'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProductVariant> & { id: string }) => {
      const { error } = await supabase.from('product_variants').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast.success('Atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_variants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', productId] });
      toast.success('Tamanho removido!');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Tamanhos disponíveis</p>
        <Button size="sm" variant="outline" onClick={() => setAddingNew(!addingNew)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Tamanho
        </Button>
      </div>

      {/* Existing variants */}
      {variants.map(v => (
        <VariantRow
          key={v.id}
          variant={v}
          onUpdate={(data) => updateMutation.mutate({ id: v.id, ...data })}
          onDelete={() => deleteMutation.mutate(v.id)}
          isDeleting={deleteMutation.isPending}
        />
      ))}

      {variants.length === 0 && !addingNew && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhum tamanho cadastrado. Adicione tamanhos como 350ml, 600ml, 2L.
        </p>
      )}

      {/* Add new */}
      {addingNew && (
        <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tamanho</Label>
              <Input
                placeholder="Ex: 350ml, 2L..."
                value={newVariant.size_label}
                onChange={(e) => setNewVariant(v => ({ ...v, size_label: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newVariant.price}
                onChange={(e) => setNewVariant(v => ({ ...v, price: Number(e.target.value) }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={newVariant.available}
                onCheckedChange={(c) => setNewVariant(v => ({ ...v, available: c }))}
              />
              <span className="text-xs">Disponível</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAddingNew(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => addMutation.mutate(newVariant)}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline editable row
const VariantRow: React.FC<{
  variant: ProductVariant;
  onUpdate: (data: Partial<ProductVariant>) => void;
  onDelete: () => void;
  isDeleting: boolean;
}> = ({ variant, onUpdate, onDelete, isDeleting }) => {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(variant.price);

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
      <Badge variant="outline" className="text-xs shrink-0">{variant.size_label}</Badge>
      {editing ? (
        <Input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="h-7 text-sm w-24"
          onBlur={() => {
            onUpdate({ price });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onUpdate({ price }); setEditing(false); }
            if (e.key === 'Escape') { setPrice(variant.price); setEditing(false); }
          }}
          autoFocus
        />
      ) : (
        <button
          className="text-sm font-bold text-primary hover:underline"
          onClick={() => setEditing(true)}
        >
          R$ {variant.price.toFixed(2)}
        </button>
      )}
      <div className="flex-1" />
      <Switch
        checked={variant.available}
        onCheckedChange={(c) => onUpdate({ available: c })}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={isDeleting}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default ProductVariantsManager;
