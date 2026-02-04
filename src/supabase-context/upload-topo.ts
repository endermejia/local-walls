import { createClient } from 'npm:@supabase/supabase-js@2.33.0';

interface Payload {
  file_name: string;
  content_type?: string;
  base64: string;
}

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

console.info('Upload-topo-photo function started');

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
      console.error('[upload-topo-photo] is_user_admin error', adminErr);
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ─────────────────────────────
    // Payload
    // ─────────────────────────────
    const raw = await req.text();
    let payload: Payload;

    try {
      payload = raw ? JSON.parse(raw) : ({} as Payload);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload?.base64) {
      return new Response(JSON.stringify({ error: 'Missing base64' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const topoId = req.headers.get('topo-id') || req.headers.get('Topo-Id');

    if (!topoId) {
      return new Response(JSON.stringify({ error: 'Missing Topo-Id header' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────
    // Get topo → crag_id
    // ─────────────────────────────
    const { data: topo, error: topoErr } = await supabaseAdminClient
      .from('topos')
      .select('crag_id')
      .eq('id', topoId)
      .single();

    if (topoErr || !topo) {
      console.error('[upload-topo-photo] topo not found', topoErr);
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
        console.error('[upload-topo-photo] is_crag_equipper error', error);
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

    // ─────────────────────────────
    // Upload
    // ─────────────────────────────
    const ext = (payload.file_name || 'photo.png').split('.').pop() || 'png';
    const fileName = `topos/${topoId}.${ext}`;

    const base64 = payload.base64.replace(/^data:.*;base64,/, '');
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const bucket = 'topos';

    const { data: uploadData, error: uploadError } =
      await supabaseAdminClient.storage.from(bucket).upload(fileName, bytes, {
        contentType: payload.content_type || `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-topo-photo] upload error', uploadError);
      return new Response(
        JSON.stringify({
          error: 'Upload failed',
          details: uploadError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const path = uploadData?.path || fileName;

    const { error: dbErr } = await supabaseAdminClient
      .from('topos')
      .update({ photo: path })
      .eq('id', topoId);

    if (dbErr) {
      console.error('[upload-topo-photo] DB update failed', dbErr);
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

    const publicUrl =
      `${SUPABASE_URL.replace(/\/$/, '')}` +
      `/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;

    return new Response(JSON.stringify({ path, publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
