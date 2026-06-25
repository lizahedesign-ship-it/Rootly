import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../../src/theme';
import { supabase } from '../../../src/services/supabase';
import { useChildStore } from '../../../src/store/childStore';
import { ChildSelector } from '../../../src/components/ChildSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneType = 'streak_7' | 'streak_30' | 'count_100';

interface MilestoneRow {
  id: string;
  type: MilestoneType;
  triggered_at: string;
  photo_url: string | null;
  task_name: string;
  task_icon: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MILESTONE_CONFIG: Record<MilestoneType, { emoji: string; label: string }> = {
  streak_7:   { emoji: '⭐', label: '7-day streak' },
  streak_30:  { emoji: '🔥', label: '30-day streak' },
  count_100:  { emoji: '💯', label: '100 completions' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecordsScreen() {
  const router = useRouter();
  const selectedChildId  = useChildStore((s) => s.selectedChildId);

  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  async function loadMilestones() {
    if (!selectedChildId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('milestone')
      .select('id, type, triggered_at, photo_url, task:task_id(name, icon)')
      .eq('child_id', selectedChildId)
      .order('triggered_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const rows: MilestoneRow[] = data.map((m: any) => {
      const task = m.task as { name: string; icon: string } | null;
      return {
        id:           m.id,
        type:         m.type as MilestoneType,
        triggered_at: m.triggered_at,
        photo_url:    m.photo_url ?? null,
        task_name:    task?.name ?? '',
        task_icon:    task?.icon ?? '',
      };
    });

    setMilestones(rows);

    // Generate signed URLs in parallel for rows that have a stored photo path
    const withPhotos = rows.filter((r) => r.photo_url);
    if (withPhotos.length > 0) {
      const results = await Promise.all(
        withPhotos.map((r) =>
          supabase.storage
            .from('milestone-photos')
            .createSignedUrl(r.photo_url!, 3600)
        )
      );
      const urls: Record<string, string> = {};
      withPhotos.forEach((r, i) => {
        const url = results[i].data?.signedUrl;
        if (url) urls[r.id] = url;
      });
      setSignedUrls(urls);
    } else {
      setSignedUrls({});
    }

    setLoading(false);
  }

  // Re-run whenever this tab gains focus OR selectedChildId changes
  useFocusEffect(
    useCallback(() => {
      void loadMilestones();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedChildId])
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <ChildSelector />

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.green600} size="large" />
        </View>
      ) : milestones.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyText}>No milestones yet. Keep going!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {milestones.map((m) => {
            const cfg      = MILESTONE_CONFIG[m.type];
            const thumbUrl = signedUrls[m.id];
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.card}
                onPress={() => router.push(`/(parent)/milestone-card/${m.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.cardLeft}>
                  {/* Milestone type */}
                  <View style={styles.typeRow}>
                    <Text style={styles.milestoneEmoji}>{cfg.emoji}</Text>
                    <Text style={styles.milestoneLabel}>{cfg.label}</Text>
                  </View>

                  {/* Habit */}
                  <View style={styles.taskRow}>
                    <Text style={styles.taskIcon}>{m.task_icon}</Text>
                    <Text style={styles.taskName} numberOfLines={1}>{m.task_name}</Text>
                  </View>

                  {/* Date */}
                  <Text style={styles.date}>{formatDate(m.triggered_at)}</Text>
                </View>

                {/* Photo thumbnail */}
                {thumbUrl ? (
                  <Image
                    source={{ uri: thumbUrl }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

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
    gap: Spacing.md,
  },

  // ── Milestone list ───────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  cardLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  milestoneEmoji: {
    fontSize: 18,
  },
  milestoneLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  taskIcon: {
    fontSize: Typography.size.base,
  },
  taskName: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  date: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    flexShrink: 0,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
