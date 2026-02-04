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

// Client to validate token / get user
const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// Admin client with service role to bypass RLS for DB writes/storage
const supabaseAdminClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

console.info('Upload-avatar function started');

Deno.serve(async (req: Request) => {
  /**
   * CORS configuration
   * Usa '*' solo si no envías cookies.
   * Para producción, reemplaza por tu dominio.
   */
  const ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'https://local-walls.vercel.app',
  ];
  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {};

  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Headers'] =
      'authorization, x-client-info, apikey, content-type';
    corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  }

  // ---- CORS preflight ----
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    // ---- Auth via Bearer token ----
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const { data: userResult, error: userErr } =
      await supabaseAuthClient.auth.getUser(token);
    if (userErr || !userResult.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const userId = userResult.user.id;

    // ---- Body (safe parse) ----
    const raw = await req.text();
    let payload: Payload;
    try {
      payload = raw ? JSON.parse(raw) : ({} as Payload);
    } catch (e) {
      console.error('[upload-avatar] invalid JSON body', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload?.base64) {
      return new Response(JSON.stringify({ error: 'Missing base64' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // ---- Get previous avatar path from DB (to delete later) ----
    const { data: existingProfile } = await supabaseAdminClient
      .from('user_profiles')
      .select('avatar')
      .eq('id', userId)
      .single();

    const oldPath: string | null =
      (existingProfile?.avatar as string | null) ?? null;

    // ---- File path: userId + timestamp to avoid cache/collisions ----
    const ext = (payload.file_name || 'avatar.png').split('.').pop() || 'png';
    const timestamp = Date.now();
    const fileName = `avatars/${userId}-${timestamp}.${ext}`;

    // ---- Base64 decode ----
    const base64 = payload.base64.replace(/^data:.*;base64,/, '');
    // atob available in Deno
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // ---- Upload using admin client ----
    const bucket = 'avatar';
    const { data: uploadData, error: uploadError } =
      await supabaseAdminClient.storage.from(bucket).upload(fileName, bytes, {
        contentType: payload.content_type || `image/${ext}`,
        // New filename per upload — no need to upsert
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({
          error: 'Upload failed',
          details: uploadError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // ---- Save path in DB using admin client (bypass RLS) ----
    const path = uploadData?.path || fileName;
    const { error: dbErr } = await supabaseAdminClient
      .from('user_profiles')
      .update({ avatar: path })
      .eq('id', userId);

    if (dbErr) {
      return new Response(
        JSON.stringify({ error: 'DB update failed', details: dbErr.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // ---- Try to delete previous avatar (best-effort) ----
    let deletedOld = false;
    if (oldPath && oldPath !== path) {
      const { error: delErr } = await supabaseAdminClient.storage
        .from(bucket)
        .remove([oldPath]);
      if (!delErr) deletedOld = true;
      else
        console.warn(
          '[upload-avatar] Failed to delete old avatar',
          delErr?.message,
        );
    }

    // ---- Public URL ----
    const publicUrl =
      `${SUPABASE_URL.replace(/\/$/, '')}` +
      `/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;

    return new Response(JSON.stringify({ path, publicUrl, deletedOld }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
