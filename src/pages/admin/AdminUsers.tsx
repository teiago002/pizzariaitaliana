import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, UserCheck, UserX, Loader2, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface InternalUser {
  id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'delivery';
  banned: boolean;
  created_at: string;
}

const roleLabels: Record<string, { label: string; color: string }> = {
  employee: { label: 'Funcionário', color: 'bg-blue-500' },
  delivery: { label: 'Entregador', color: 'bg-orange-500' },
};

const callAdminUsers = async (method: string, body?: object) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
};

const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<InternalUser | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee' as 'employee' | 'delivery',
  });

  const { data: users = [], isLoading } = useQuery<InternalUser[]>({
    queryKey: ['admin-internal-users'],
    queryFn: async () => {
      const data = await callAdminUsers('GET');
      return data.users;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => callAdminUsers('POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
      toast.success('Usuário criado com sucesso!');
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error('Erro ao criar: ' + e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { user_id: string; role?: string; banned?: boolean }) =>
      callAdminUsers('PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
      toast.success('Usuário atualizado!');
      setDialogOpen(false);
      setEditingUser(null);
    },
    onError: (e: any) => toast.error('Erro ao atualizar: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => callAdminUsers('DELETE', { user_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-internal-users'] });
      toast.success('Usuário excluído!');
    },
    onError: (e: any) => toast.error('Erro ao excluir: ' + e.message),
  });

  const resetForm = () => {
    setForm({ email: '', password: '', full_name: '', role: 'employee' });
    setEditingUser(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (user: InternalUser) => {
    setEditingUser(user);
    setForm({ email: user.email, password: '', full_name: user.full_name, role: user.role });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingUser) {
      updateMutation.mutate({ user_id: editingUser.id, role: form.role });
    } else {
      if (!form.email || !form.password) {
        toast.error('Email e senha são obrigatórios');
        return;
      }
      createMutation.mutate(form);
    }
  };

  const toggleBan = (user: InternalUser) => {
    updateMutation.mutate({ user_id: user.id, banned: !user.banned });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários Internos</h1>
          <p className="text-muted-foreground">Gerencie funcionários e entregadores</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum usuário interno cadastrado ainda.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Criar primeiro usuário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const roleInfo = roleLabels[user.role] || { label: user.role, color: 'bg-gray-500' };
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={user.banned ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.full_name || '—'}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Badge className={`${roleInfo.color} text-white shrink-0`}>
                        {roleInfo.label}
                      </Badge>
                    </div>

                    {user.banned && (
                      <Badge variant="destructive" className="mb-3">Desativado</Badge>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={user.banned ? 'default' : 'secondary'}
                        onClick={() => toggleBan(user)}
                        disabled={updateMutation.isPending}
                      >
                        {user.banned ? (
                          <><UserCheck className="w-3 h-3 mr-1" /> Ativar</>
                        ) : (
                          <><UserX className="w-3 h-3 mr-1" /> Desativar</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Excluir ${user.email}? Esta ação não pode ser desfeita.`)) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário Interno'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editingUser && (
              <>
                <div>
                  <Label>Nome completo</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </>
            )}

            {editingUser && (
              <div>
                <Label>Usuário</Label>
                <p className="text-sm font-medium">{editingUser.email}</p>
              </div>
            )}

            <div>
              <Label>Função</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm(f => ({ ...f, role: v as 'employee' | 'delivery' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Funcionário</SelectItem>
                  <SelectItem value="delivery">Entregador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
