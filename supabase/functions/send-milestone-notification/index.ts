// supabase/functions/send-milestone-notification/index.ts
// Slice 13 — Milestone push notification
//
// POST /functions/v1/send-milestone-notification
// Authorization: Bearer <user JWT>          ← sent automatically by supabase.functions.invoke()
// Body: { "parent_id": "uuid", "child_id": "uuid" }
//
// Validates the JWT, fetches the parent's push token and child's name,
// then sends a push via the Expo Push API.
// Returns 200 even when no token exists (parent hasn't granted permission).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Parse body
    // -------------------------------------------------------------------------
    const { parent_id, child_id } = await req.json() as {
      parent_id: string
      child_id: string
    }

    if (!parent_id || !child_id) {
      return new Response(
        JSON.stringify({ error: 'parent_id and child_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -------------------------------------------------------------------------
    // 2. Validate JWT — caller must be the parent they claim to be
    // -------------------------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(jwt)
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (user.id !== parent_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -------------------------------------------------------------------------
    // 3. Fetch push token and child name in parallel
    // -------------------------------------------------------------------------
    const [accountRes, childRes] = await Promise.all([
      supabaseAdmin
        .from('parent_account')
        .select('push_token')
        .eq('id', parent_id)
        .single(),
      supabaseAdmin
        .from('child_profile')
        .select('name')
        .eq('id', child_id)
        .single(),
    ])

    const pushToken = accountRes.data?.push_token as string | null
    const childName = childRes.data?.name as string | null

    // No token → parent hasn't granted permission. Not an error.
    if (!pushToken) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'no_token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate token format (physical device tokens start with ExponentPushToken[)
    if (!pushToken.startsWith('ExponentPushToken[')) {
      return new Response(
        JSON.stringify({ sent: false, reason: 'invalid_token_format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // -------------------------------------------------------------------------
    // 4. Send push via Expo Push API
    // -------------------------------------------------------------------------
    const name = childName ?? 'Your child'
    const message = {
      to: pushToken,
      title: 'Milestone reached! ⭐',
      body: `${name} just hit a big milestone. Open Rootzy to celebrate.`,
      sound: 'default',
    }

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(message),
    })

    const expoBody = await expoRes.json()

    return new Response(
      JSON.stringify({ sent: true, expo: expoBody }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
