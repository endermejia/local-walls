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

console.info('Delete-route-ascent-photo function started');

Deno.serve(async (req: Request) => {
  const ALLOWED_ORIGINS = ['http://localhost:4200', 'https://climbeast.com'];

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {};

  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Headers'] =
      'authorization, x-client-info, apikey, content-type, ascent-id';
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

    const ascentId =
      req.headers.get('ascent-id') || req.headers.get('Ascent-Id');

    if (!ascentId) {
      return new Response(
        JSON.stringify({ error: 'Missing Ascent-Id header' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ─────────────────────────────
    // Get ascent → user_id and photo_path check
    // ─────────────────────────────
    const { data: ascent, error: ascentErr } = await supabaseAdminClient
      .from('route_ascents')
      .select('user_id, photo_path')
      .eq('id', ascentId)
      .single();

    if (ascentErr || !ascent) {
      console.error('[delete-route-ascent-photo] ascent not found', ascentErr);
      return new Response(JSON.stringify({ error: 'Ascent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ascent.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden: only the owner can delete the photo',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!ascent.photo_path) {
      return new Response(JSON.stringify({ message: 'No photo to delete' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────
    // Storage Deletion
    // ─────────────────────────────
    const bucket = 'route-ascent-photos';
    const { error: deleteError } = await supabaseAdminClient.storage
      .from(bucket)
      .remove([ascent.photo_path]);

    if (deleteError) {
      console.error(
        '[delete-route-ascent-photo] Storage removal failed',
        deleteError,
      );
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
    // DB Update (Set photo_path to null)
    // ─────────────────────────────
    const { error: dbErr } = await supabaseAdminClient
      .from('route_ascents')
      .update({ photo_path: null })
      .eq('id', ascentId);

    if (dbErr) {
      console.error('[delete-route-ascent-photo] DB update failed', dbErr);
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
