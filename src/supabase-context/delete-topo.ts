import { createClient } from 'npm:@supabase/supabase-js@2.33.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or keys');
}

const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const supabaseAdminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

console.info('Delete-topo-photo function started');

Deno.serve(async (req: Request) => {
  const ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'https://local-walls.vercel.app',
  ];

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {};

  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Headers'] =
      'authorization, x-client-info, apikey, content-type, topo-id';
    corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    // ─────────────────────────────
    // Auth
    // ─────────────────────────────
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userResult, error: userErr } =
      await supabaseAuthClient.auth.getUser(token);

    if (userErr || !userResult.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userResult.user.id;

    // ─────────────────────────────
    // Admin check
    // ─────────────────────────────
    const { data: isAdmin, error: adminErr } = await supabaseAdminClient.rpc(
      'is_user_admin',
      {
        p_uid: userId,
      },
    );

    if (adminErr) {
      console.error('[delete-topo-photo] is_user_admin error', adminErr);
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const topoId = req.headers.get('topo-id') || req.headers.get('Topo-Id');

    if (!topoId) {
      return new Response(JSON.stringify({ error: 'Missing Topo-Id header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────
    // Get topo → crag_id and photo path check
    // ─────────────────────────────
    const { data: topo, error: topoErr } = await supabaseAdminClient
      .from('topos')
      .select('crag_id, photo')
      .eq('id', topoId)
      .single();

    if (topoErr || !topo) {
      console.error('[delete-topo-photo] topo not found', topoErr);
      return new Response(JSON.stringify({ error: 'Topo not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────
    // Crag equipper check (only if not admin)
    // ─────────────────────────────
    let isCragEquipper = false;

    if (!isAdmin) {
      const { data, error } = await supabaseAdminClient.rpc(
        'is_crag_equipper',
        { p_crag_id: topo.crag_id },
      );

      if (error) {
        console.error('[delete-topo-photo] is_crag_equipper error', error);
        return new Response(
          JSON.stringify({ error: 'Permission check failed' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      isCragEquipper = Boolean(data);
    }

    if (!isAdmin && !isCragEquipper) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: admin or crag equipper only',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!topo.photo) {
      return new Response(JSON.stringify({ message: 'No photo to delete' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────
    // Storage Deletion
    // ─────────────────────────────
    const bucket = 'topos';
    const { error: deleteError } = await supabaseAdminClient.storage
      .from(bucket)
      .remove([topo.photo]);

    if (deleteError) {
      console.error('[delete-topo-photo] Storage removal failed', deleteError);
      return new Response(
        JSON.stringify({
          error: 'Storage removal failed',
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ─────────────────────────────
    // DB Update (Set photo to null)
    // ─────────────────────────────
    const { error: dbErr } = await supabaseAdminClient
      .from('topos')
      .update({ photo: null })
      .eq('id', topoId);

    if (dbErr) {
      console.error('[delete-topo-photo] DB update failed', dbErr);
      return new Response(
        JSON.stringify({
          error: 'DB update failed',
          details: dbErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ message: 'Photo deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
