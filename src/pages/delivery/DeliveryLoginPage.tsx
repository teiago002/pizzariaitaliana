import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';

const DeliveryLoginPage: React.FC = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const { login, userRole, user } = useAuth();
  const navigate = useNavigate();

  // Se já estiver logado como entregador, redireciona
  useEffect(() => {
    if (user && userRole === 'delivery') {
      navigate('/entregador/entregas');
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await login(email, password);
    if (success) {
      // Aguarda um momento para o papel ser carregado
      setTimeout(() => {
        if (userRole === 'delivery') {
          navigate('/entregador/entregas');
        } else {
          toast.error('Este usuário não é um entregador');
          // Faz logout se não for entregador
          // (você precisaria adicionar logout no useAuth ou chamar aqui)
        }
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Truck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Login do Entregador</CardTitle>
          <CardDescription>
            Acesse o sistema de entregas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryLoginPage;