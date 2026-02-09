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

console.info('Delete-user function started');

Deno.serve(async (req: Request) => {
  const ALLOWED_ORIGINS = ['http://localhost:4200', 'https://climbeast.com'];

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {};

  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Headers'] =
      'authorization, x-client-info, apikey, content-type';
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

    console.info(`[delete-user] Cleaning up data for user: ${userId}`);

    // ─────────────────────────────
    // Clean up related data
    // ─────────────────────────────

    // 1. Delete likes and comments on user's ascents
    const { data: userAscents } = await supabaseAdminClient
      .from('route_ascents')
      .select('id')
      .eq('user_id', userId);

    if (userAscents && userAscents.length > 0) {
      const ascentIds = userAscents.map((a: { id: number }) => a.id);
      await supabaseAdminClient
        .from('route_ascent_comments')
        .delete()
        .in('route_ascent_id', ascentIds);
      await supabaseAdminClient
        .from('route_ascent_likes')
        .delete()
        .in('route_ascent_id', ascentIds);
    }

    // 2. Comprehensive table cleanup
    const tablesToClean = [
      { table: 'user_roles', column: 'id' },
      { table: 'area_equippers', column: 'user_id' },
      { table: 'area_likes', column: 'user_id' },
      { table: 'crag_likes', column: 'user_id' },
      { table: 'route_likes', column: 'user_id' },
      { table: 'route_projects', column: 'user_id' },
      { table: 'user_follows', column: 'user_id' },
      { table: 'user_follows', column: 'followed_user_id' },
      { table: 'user_blocks', column: 'blocker_id' },
      { table: 'user_blocks', column: 'blocked_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'notifications', column: 'actor_id' },
      { table: 'chat_messages', column: 'sender_id' },
      { table: 'chat_participants', column: 'user_id' },
      { table: 'route_ascent_comments', column: 'user_id' },
      { table: 'route_ascent_likes', column: 'user_id' },
      { table: 'route_ascents', column: 'user_id' },
      { table: 'user_profiles', column: 'id' },
    ];

    for (const { table, column } of tablesToClean) {
      const { error: cleanupError } = await supabaseAdminClient
        .from(table)
        .delete()
        .eq(column, userId);

      if (cleanupError) {
        console.warn(
          `[delete-user] Cleanup warning for ${table} (${column}):`,
          cleanupError.message,
        );
      }
    }

    // ─────────────────────────────
    // Delete User from Auth
    // ─────────────────────────────
    const { error: deleteError } =
      await supabaseAdminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('[delete-user] Deletion failed', deleteError);
      return new Response(
        JSON.stringify({
          error: 'Deletion failed',
          details: deleteError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
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
