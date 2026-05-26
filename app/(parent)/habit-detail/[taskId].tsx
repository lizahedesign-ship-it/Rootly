import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import {
  Colors,
  StageColors,
  Typography,
  Spacing,
  Radius,
  Shadow,
} from '../../../src/theme';
import type { HabitStage } from '../../../src/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskDetail {
  name: string;
  icon: string;
}

interface HabitSnapshot {
  stage: HabitStage;
  consistency_rate: number | null;
  avg_recovery_days: number | null;
  trend: 'up' | 'flat' | 'down' | null;
}

interface MilestoneItem {
  id: string;
  type: 'streak_7' | 'streak_30' | 'count_100';
  triggered_at: string;
}

// ─── Static content ───────────────────────────────────────────────────────────

// Progress bar order — matches habit journey (not the parent-home sort order)
const JOURNEY_STAGES: HabitStage[] = ['sprouting', 'growing', 'rooted', 'blooming'];

const STAGE_INSIGHTS: Record<
  HabitStage,
  { whatsHappening: string; whatHelps: string; sayToChild: string }
> = {
  sprouting: {
    whatsHappening:
      "You've just planted this habit together. Early days are about showing up, not perfection. Every attempt builds a little more of the pattern.",
    whatHelps:
      'Keep it simple and visible. A consistent time of day — right after breakfast, before bedtime — helps more than reminders.',
    sayToChild:
      "You started something brand new! Every time you do it, it gets a little easier.",
  },
  growing: {
    whatsHappening:
      'This habit is going through a rough patch. Some inconsistency has crept in over recent weeks. This is normal — it just needs a little extra attention.',
    whatHelps:
      'Try pairing this habit with something your child already does reliably. Make it unavoidable, not a choice.',
    sayToChild:
      "I noticed this one's been tricky lately. What would make it a little easier for you?",
  },
  rooted: {
    whatsHappening:
      "This habit is showing up consistently. It's starting to feel like a natural part of your child's day rather than something to be reminded about.",
    whatHelps:
      'Step back and give your child more ownership. Your job now is mostly to notice and appreciate — not to prompt.',
    sayToChild:
      "I can really see this becoming part of your routine. I'm proud of how you're showing up.",
  },
  blooming: {
    whatsHappening:
      'This habit is deeply established. Your child is doing this reliably and independently. It has become part of who they are.',
    whatHelps:
      'Celebrate this! You can now think about what to build next together. The groundwork here will help the next habit take root faster.',
    sayToChild:
      "This is just part of who you are now. That's something you built yourself — that's amazing.",
  },
  graduated: {
    whatsHappening:
      "This habit has been graduated — it's so deeply part of your child's life that it no longer needs tracking.",
    whatHelps:
      'Keep celebrating it quietly. You can restore it to the active list any time if needed.',
    sayToChild:
      "This habit is just part of you now. You don't even need a reminder anymore.",
  },
};

const MILESTONE_CONFIG = {
  streak_7:   { emoji: '⭐', label: '7-day streak' },
  streak_30:  { emoji: '🔥', label: '30-day streak' },
  count_100:  { emoji: '💯', label: '100 completions' },
} as const;

const SIGNAL_TOOLTIPS = {
  consistency:
    'The % of scheduled days this habit has been completed since it was created. This number never resets.',
  recovery:
    'After a missed day, how many days it typically takes to get back on track. Only shown after 3 or more misses.',
  trend:
    'Whether this habit is improving, staying steady, or declining over the past 4 weeks.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function trendLabel(trend: HabitSnapshot['trend']): string {
  if (!trend) return '—';
  return { up: 'Improving ↑', flat: 'Steady →', down: 'Declining ↓' }[trend];
}

function trendColor(trend: HabitSnapshot['trend']): string {
  if (!trend) return Colors.textMuted;
  return {
    up:   Colors.green600,
    flat: Colors.textSecondary,
    down: Colors.warning,
  }[trend];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();

  const [task, setTask]           = useState<TaskDetail | null>(null);
  const [snapshot, setSnapshot]   = useState<HabitSnapshot | null>(null);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [graduating, setGraduating] = useState(false);

  // Tooltip open state for each signal
  const [showConsistencyTip, setShowConsistencyTip] = useState(false);
  const [showRecoveryTip, setShowRecoveryTip]       = useState(false);
  const [showTrendTip, setShowTrendTip]             = useState(false);

  useEffect(() => {
    if (!taskId) return;
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function loadAll() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    console.log('[HabitDetail] auth.uid =', user?.id, '| taskId =', taskId);

    const [taskRes, snapRes, msRes] = await Promise.all([
      supabase
        .from('task')
        .select('name, icon')
        .eq('id', taskId)
        .single(),
      supabase
        .from('habit_health_snapshot')
        .select('stage, consistency_rate, avg_recovery_days, trend')
        .eq('task_id', taskId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('milestone')
        .select('id, type, triggered_at')
        .eq('task_id', taskId)
        .order('triggered_at', { ascending: false }),
    ]);

    console.log('[HabitDetail] milestone query — error:', msRes.error, '| data:', msRes.data);

    if (taskRes.data) {
      setTask({ name: taskRes.data.name, icon: taskRes.data.icon });
    }

    setSnapshot(
      snapRes.data
        ? {
            stage:              snapRes.data.stage as HabitStage,
            consistency_rate:   snapRes.data.consistency_rate,
            avg_recovery_days:  snapRes.data.avg_recovery_days,
            trend:              snapRes.data.trend as HabitSnapshot['trend'],
          }
        : { stage: 'sprouting', consistency_rate: null, avg_recovery_days: null, trend: null },
    );

    setMilestones(
      (msRes.data ?? []).map((m: any) => ({
        id:           m.id,
        type:         m.type as MilestoneItem['type'],
        triggered_at: m.triggered_at,
      })),
    );

    setLoading(false);
  }

  // ── Graduate ─────────────────────────────────────────────────────────────────

  function handleGraduate() {
    Alert.alert(
      'Graduate this habit?',
      "This habit will be removed from the daily task list. All history, milestones, and progress are preserved forever. You can restore it any time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Graduate 🎓', style: 'default', onPress: confirmGraduate },
      ],
    );
  }

  async function confirmGraduate() {
    if (!taskId) return;
    setGraduating(true);
    const { error } = await supabase
      .from('task')
      .update({ is_graduated: true, graduated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      Alert.alert('Error', "Couldn't graduate this habit. Please try again.");
      setGraduating(false);
    } else {
      router.back();
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.green600} size="large" />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.errorText}>Habit not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const stage      = snapshot?.stage ?? 'sprouting';
  const stageCfg   = StageColors[stage];
  // For graduated habits, treat all journey steps as complete
  const stageIndex = stage === 'graduated' ? JOURNEY_STAGES.length : JOURNEY_STAGES.indexOf(stage);
  const insights   = STAGE_INSIGHTS[stage];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Back nav */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{task.icon}</Text>
          <Text style={styles.heroName}>{task.name}</Text>
          <View style={[styles.stageBadge, { backgroundColor: stageCfg.bg }]}>
            <Text style={[styles.stageBadgeText, { color: stageCfg.text }]}>
              {stageCfg.emoji}  {stageCfg.label}
            </Text>
          </View>
        </View>

        {/* ── Stage progress bar ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit journey</Text>
          <View style={styles.progressRow}>
            {JOURNEY_STAGES.map((s, idx) => {
              const isCurrent = idx === stageIndex;
              const isPast    = idx < stageIndex;
              const isFirst   = idx === 0;
              const isLast    = idx === JOURNEY_STAGES.length - 1;
              const cfg       = StageColors[s];

              // Left and right connector halves — colour independently
              const leftFilled  = !isFirst && idx <= stageIndex;
              const rightFilled = !isLast  && idx < stageIndex;

              return (
                <View key={s} style={styles.progressItem}>
                  {/* Node row: left connector + circle + right connector */}
                  <View style={styles.progressNodeRow}>
                    <View
                      style={[
                        styles.progressConnector,
                        { backgroundColor: leftFilled ? Colors.green700 : Colors.border },
                        isFirst && styles.progressConnectorInvisible,
                      ]}
                    />
                    <View
                      style={[
                        styles.progressNode,
                        isCurrent
                          ? { borderColor: Colors.green700, borderWidth: 2.5 }
                          : isPast
                          ? { borderColor: Colors.green700, borderWidth: 1.5 }
                          : {},
                      ]}
                    >
                      <Text
                        style={[
                          styles.progressEmoji,
                          !isCurrent && !isPast && { opacity: 0.4 },
                        ]}
                      >
                        {cfg.emoji}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.progressConnector,
                        { backgroundColor: rightFilled ? Colors.green700 : Colors.border },
                        isLast && styles.progressConnectorInvisible,
                      ]}
                    />
                  </View>
                  {/* Label below node */}
                  <Text
                    style={[
                      styles.progressLabel,
                      isCurrent && { color: Colors.green700, fontFamily: 'Nunito_700Bold' },
                      isPast    && { color: Colors.green700, fontFamily: 'Nunito_700Bold' },
                      !isCurrent && !isPast && { opacity: 0.4 },
                    ]}
                    numberOfLines={1}
                  >
                    {cfg.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Three signals ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signals</Text>
          <View style={[styles.card, Shadow.sm]}>

            {/* Consistency rate */}
            <View style={styles.signalRow}>
              <TouchableOpacity
                style={styles.signalLabelRow}
                onPress={() => setShowConsistencyTip((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.signalName}>Consistency</Text>
                <Feather name="info" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.signalValue}>
                {snapshot?.consistency_rate != null
                  ? `${Math.round(snapshot.consistency_rate)}%`
                  : '—'}
              </Text>
              {showConsistencyTip && (
                <Text style={styles.tooltipText}>{SIGNAL_TOOLTIPS.consistency}</Text>
              )}
            </View>

            <View style={styles.signalDivider} />

            {/* Recovery speed */}
            <View style={styles.signalRow}>
              <TouchableOpacity
                style={styles.signalLabelRow}
                onPress={() => setShowRecoveryTip((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.signalName}>Recovery</Text>
                <Feather name="info" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.signalValue}>
                {snapshot?.avg_recovery_days != null
                  ? `${snapshot.avg_recovery_days.toFixed(1)} days`
                  : '—'}
              </Text>
              {showRecoveryTip && (
                <Text style={styles.tooltipText}>{SIGNAL_TOOLTIPS.recovery}</Text>
              )}
            </View>

            <View style={styles.signalDivider} />

            {/* Trend */}
            <View style={styles.signalRow}>
              <TouchableOpacity
                style={styles.signalLabelRow}
                onPress={() => setShowTrendTip((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.signalName}>Trend</Text>
                <Feather name="info" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={[styles.signalValue, { color: trendColor(snapshot?.trend ?? null) }]}>
                {trendLabel(snapshot?.trend ?? null)}
              </Text>
              {showTrendTip && (
                <Text style={styles.tooltipText}>{SIGNAL_TOOLTIPS.trend}</Text>
              )}
            </View>

          </View>
        </View>

        {/* ── What's happening ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's happening</Text>
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.insightText}>{insights.whatsHappening}</Text>
          </View>
        </View>

        {/* ── What helps ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What helps</Text>
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.insightText}>{insights.whatHelps}</Text>
          </View>
        </View>

        {/* ── Say to your child ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Say to your child</Text>
          <View style={[styles.sayCard, { borderLeftColor: stageCfg.text }, Shadow.sm]}>
            <Text style={[styles.sayQuoteMark, { color: stageCfg.text }]}>"</Text>
            <Text style={styles.sayText}>{insights.sayToChild}</Text>
          </View>
        </View>

        {/* ── Milestones ─────────────────────────────────────────────────────── */}
        <View style={[styles.section, stage !== 'blooming' && styles.lastSection]}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          {milestones.length === 0 ? (
            <View style={styles.emptyMilestones}>
              <Text style={styles.emptyMilestoneEmoji}>🌱</Text>
              <Text style={styles.emptyMilestoneText}>No milestones yet. Keep going!</Text>
            </View>
          ) : (
            <View style={[styles.card, Shadow.sm]}>
              {milestones.map((m, idx) => {
                const cfg = MILESTONE_CONFIG[m.type];
                return (
                  <View key={m.id}>
                    {idx > 0 && <View style={styles.signalDivider} />}
                    <TouchableOpacity
                      style={styles.milestoneRow}
                      onPress={() => router.push(`/milestone-card/${m.id}` as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.milestoneEmoji}>{cfg.emoji}</Text>
                      <View style={styles.milestoneMeta}>
                        <Text style={styles.milestoneLabel}>{cfg.label}</Text>
                        <Text style={styles.milestoneDate}>{formatDate(m.triggered_at)}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Graduate button (blooming only) ────────────────────────────────── */}
        {stage === 'blooming' && (
          <View style={[styles.section, styles.lastSection]}>
            <TouchableOpacity
              style={[styles.graduateBtn, graduating && styles.graduateBtnDisabled]}
              onPress={handleGraduate}
              activeOpacity={0.85}
              disabled={graduating}
            >
              {graduating ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.graduateBtnText}>Graduate this habit 🎓</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Back nav
  backBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },

  errorText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },

  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  heroIcon: {
    fontSize: 56,
  },
  heroName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  stageBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  stageBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.sm,
    letterSpacing: 0.3,
  },

  // ── Section wrapper ─────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },

  // ── Stage progress bar ──────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xs,
  },
  progressConnector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  progressConnectorInvisible: {
    opacity: 0,
  },
  progressNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressEmoji: {
    fontSize: 18,
  },
  progressLabel: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.xs,
    textAlign: 'center',
  },

  // ── Shared card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },

  // ── Signal rows ─────────────────────────────────────────────────────────────
  signalRow: {
    paddingVertical: Spacing.md,
  },
  signalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  signalName: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  signalValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  tooltipText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.size.sm * 1.55,
    marginTop: Spacing.xs,
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  signalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 0,
  },

  // ── Insight text ────────────────────────────────────────────────────────────
  insightText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: Typography.size.base * 1.6,
    paddingVertical: Spacing.md,
  },

  // ── Say to your child ───────────────────────────────────────────────────────
  sayCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    paddingVertical: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  sayQuoteMark: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['3xl'],
    lineHeight: Typography.size['3xl'],
    marginBottom: Spacing.xs,
    opacity: 0.55,
  },
  sayText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
    lineHeight: Typography.size.base * 1.6,
    fontStyle: 'italic',
  },

  // ── Milestones ──────────────────────────────────────────────────────────────
  emptyMilestones: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
  },
  emptyMilestoneEmoji: {
    fontSize: 36,
  },
  emptyMilestoneText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  milestoneEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  milestoneMeta: {
    flex: 1,
    gap: Spacing.xs,
  },
  milestoneLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  milestoneDate: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },

  // ── Graduate button ──────────────────────────────────────────────────────────
  graduateBtn: {
    backgroundColor: Colors.green700,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  graduateBtnDisabled: {
    opacity: 0.5,
  },
  graduateBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
});
