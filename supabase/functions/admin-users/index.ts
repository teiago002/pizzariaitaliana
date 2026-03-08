import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UserData {
  email?: string;
  password?: string;
  full_name?: string;
  role?: 'employee' | 'delivery';
  user_id?: string;
  banned?: boolean;
}

serve(async function (req: { headers: { get: (arg0: string) => any; }; method: any; json: () => UserData | PromiseLike<UserData>; }) {
  try {
    // Criar cliente Supabase com chave de serviço
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar se o usuário é admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado - apenas administradores' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const method = req.method;
    const body: UserData = method !== 'GET' ? await req.json() : {};

    // GET - Listar usuários internos
    if (method === 'GET') {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select(`
          user_id,
          email,
          full_name,
          user_roles!inner(role),
          banned
        `)
        .in('user_id', (await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .in('role', ['employee', 'delivery'])
        ).data?.map(r => r.user_id) || []);

      if (profilesError) throw profilesError;

      const users = profiles?.map(p => ({
        id: p.user_id,
        email: p.email,
        full_name: p.full_name || '',
        role: p.user_roles.role,
        banned: p.banned || false,
        created_at: p.created_at || new Date().toISOString()
      })) || [];

      return new Response(JSON.stringify({ users }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // POST - Criar novo usuário
    if (method === 'POST') {
      const { email, password, full_name, role } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email e senha são obrigatórios' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Criar usuário no Auth
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role }
      });

      if (createError) throw createError;
      if (!authUser.user) throw new Error('Erro ao criar usuário');

      // Criar perfil
      await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          email,
          full_name: full_name || '',
        });

      // Atribuir papel
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role: role || 'employee'
        });

      return new Response(JSON.stringify({
        success: true,
        user_id: authUser.user.id
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // PATCH - Atualizar usuário (role ou ban)
    if (method === 'PATCH') {
      const { user_id, role, banned } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (role) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role })
          .eq('user_id', user_id);
      }

      if (banned !== undefined) {
        await supabaseAdmin
          .from('profiles')
          .update({ banned })
          .eq('user_id', user_id);

        if (banned) {
          await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' });
        } else {
          await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // DELETE - Excluir usuário
    if (method === 'DELETE') {
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Deletar perfil
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', user_id);

      // Deletar papel
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id);

      // Deletar usuário do Auth
      await supabaseAdmin.auth.admin.deleteUser(user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
})