// supabase/functions/send-weekly-summary/index.ts
// Slice 13 — Weekly summary push notification
//
// Triggered by cron: every Sunday at 09:00 UTC
// (Configure in Supabase Dashboard > Edge Functions > Schedule)
//
// Sends one push per parent: "X out of Y habits completed this week."
// The week window is the 7 days ending yesterday (Saturday).
// One aggregate number across all children — avoids multiple pushes per family.
// Skipped if the parent has no push token or no scheduled habits this week.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---------------------------------------------------------------------------
// Date helpers (UTC throughout)
// ---------------------------------------------------------------------------

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStr(d)
}

// ---------------------------------------------------------------------------
// Scheduled day check within a window
// ---------------------------------------------------------------------------

// Returns the count of scheduled days for this task within [windowStart, windowEnd].
function scheduledDaysInWindow(
  createdAt: string,
  frequency: string,
  customDays: number[],
  windowStart: string,
  windowEnd: string,
): number {
  const taskStart = createdAt.split('T')[0]
  // Task must have existed at or before windowEnd
  if (taskStart > windowEnd) return 0

  const start = new Date(Math.max(
    new Date(taskStart + 'T00:00:00Z').getTime(),
    new Date(windowStart + 'T00:00:00Z').getTime(),
  ))
  const end = new Date(windowEnd + 'T00:00:00Z')

  let count = 0
  const cur = new Date(start)

  while (cur <= end) {
    const dow = cur.getUTCDay()        // 0 = Sun
    const iso = dow === 0 ? 7 : dow   // 1 = Mon … 7 = Sun

    const scheduled =
      frequency === 'daily'    ? true :
      frequency === 'weekdays' ? iso <= 5 :
      frequency === 'weekends' ? iso >= 6 :
      frequency === 'custom'   ? customDays.includes(iso) :
      false

    if (scheduled) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  return count
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface Task {
  id: string
  parent_id: string
  frequency: string
  custom_days: number[] | null
  created_at: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Week window: 7 days ending yesterday (Saturday when run on Sunday).
    const todayStr   = toDateStr(new Date())
    const weekEnd    = addDays(todayStr, -1)
    const weekStart  = addDays(todayStr, -7)

    // -------------------------------------------------------------------------
    // 1. Fetch all active, non-graduated tasks
    // -------------------------------------------------------------------------
    const { data: tasks, error: tasksErr } = await supabase
      .from('task')
      .select('id, parent_id, frequency, custom_days, created_at')
      .eq('is_active', true)
      .eq('is_graduated', false)

    if (tasksErr) throw tasksErr
    if (!tasks?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // -------------------------------------------------------------------------
    // 2. Compute scheduled opportunities per parent
    // -------------------------------------------------------------------------
    const scheduledByParent: Record<string, number> = {}
    const taskIdsByParent: Record<string, string[]> = {}

    for (const task of tasks as Task[]) {
      const scheduled = scheduledDaysInWindow(
        task.created_at,
        task.frequency,
        task.custom_days ?? [],
        weekStart,
        weekEnd,
      )
      scheduledByParent[task.parent_id] = (scheduledByParent[task.parent_id] ?? 0) + scheduled
      ;(taskIdsByParent[task.parent_id] ??= []).push(task.id)
    }

    // -------------------------------------------------------------------------
    // 3. Fetch completions for the week window (one query per parent group)
    // -------------------------------------------------------------------------
    const allTaskIds = (tasks as Task[]).map((t) => t.id)
    const { data: completions, error: compErr } = await supabase
      .from('task_completion')
      .select('task_id, parent_id, completed_at')
      .in('task_id', allTaskIds)
      .gte('completed_at', weekStart)
      .lte('completed_at', weekEnd)

    if (compErr) throw compErr

    // Sum completions per parent
    const completedByParent: Record<string, number> = {}
    for (const c of completions ?? []) {
      completedByParent[c.parent_id] = (completedByParent[c.parent_id] ?? 0) + 1
    }

    // -------------------------------------------------------------------------
    // 4. Fetch push tokens for all parents
    // -------------------------------------------------------------------------
    const parentIds = Object.keys(scheduledByParent)
    const { data: accounts } = await supabase
      .from('parent_account')
      .select('id, push_token')
      .in('id', parentIds)

    const tokenByParent: Record<string, string | null> = {}
    for (const a of accounts ?? []) {
      tokenByParent[a.id] = a.push_token ?? null
    }

    // -------------------------------------------------------------------------
    // 5. Build push messages
    // -------------------------------------------------------------------------
    const pushMessages: object[] = []

    for (const parentId of parentIds) {
      const pushToken = tokenByParent[parentId]
      if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) continue

      const scheduled = scheduledByParent[parentId] ?? 0
      if (scheduled === 0) continue   // No habits scheduled this week — skip

      const completed = completedByParent[parentId] ?? 0

      pushMessages.push({
        to:    pushToken,
        title: 'Weekly habit summary',
        body:  `${completed} out of ${scheduled} habits completed this week.`,
        sound: 'default',
      })
    }

    // -------------------------------------------------------------------------
    // 6. Send pushes (Expo accepts up to 100 per request)
    // -------------------------------------------------------------------------
    if (pushMessages.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(pushMessages),
      })
    }

    return new Response(
      JSON.stringify({ sent: pushMessages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
