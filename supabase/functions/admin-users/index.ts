import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const method = req.method;

  try {
    // GET /admin-users → list internal users (employee + delivery)
    if (method === 'GET') {
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['employee', 'delivery']);

      if (rolesError) throw rolesError;

      const userIds = [...new Set(roles.map((r: any) => r.user_id))];
      if (userIds.length === 0) {
        return new Response(JSON.stringify({ users: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const internalUsers = authUsers.users
        .filter((u: any) => userIds.includes(u.id))
        .map((u: any) => {
          const userRoles = roles.filter((r: any) => r.user_id === u.id).map((r: any) => r.role);
          return {
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || '',
            role: userRoles[0] || 'employee',
            banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
            created_at: u.created_at,
          };
        });

      return new Response(JSON.stringify({ users: internalUsers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /admin-users → create new internal user
    if (method === 'POST') {
      const body = await req.json();
      const { email, password, full_name, role } = body;

      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: 'Email, password e role são obrigatórios' }), { status: 400, headers: corsHeaders });
      }

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) throw createError;

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: created.user.id, role });

      if (roleError) throw roleError;

      return new Response(JSON.stringify({ user: created.user }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /admin-users → update role or ban status
    if (method === 'PATCH') {
      const body = await req.json();
      const { user_id, role, banned } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), { status: 400, headers: corsHeaders });
      }

      if (role !== undefined) {
        // Remove existing employee/delivery roles then re-assign
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', user_id)
          .in('role', ['employee', 'delivery']);

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id, role });

        if (roleError) throw roleError;
      }

      if (banned !== undefined) {
        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
          ban_duration: banned ? '876600h' : 'none',
        });
        if (banError) throw banError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /admin-users → delete user
    if (method === 'DELETE') {
      const body = await req.json();
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), { status: 400, headers: corsHeaders });
      }

      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (err: any) {
    console.error('admin-users error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
