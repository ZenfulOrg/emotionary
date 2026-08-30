import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error: userError } = await userClient.auth.getUser();
  if (userError || !data.user) {
    return new Response(JSON.stringify({ error: 'Your session is invalid or expired.' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: 'Your account could not be deleted.' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ deleted: true }), { headers: corsHeaders });
});
