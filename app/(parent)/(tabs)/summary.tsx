import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../../src/theme';
import { useChildStore } from '../../../src/store/childStore';
import { useSummary, SummaryView, ChartBar, TaskStat } from '../../../src/hooks/useSummary';

const VIEWS: Array<{ id: SummaryView; label: string }> = [
  { id: 'weekly',  label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'annual',  label: 'Annual' },
];

const BAR_MAX_HEIGHT = 100;

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ bars }: { bars: ChartBar[] }) {
  if (bars.length === 0) return null;

  return (
    <View style={chartStyles.wrapper}>
      <View style={[chartStyles.barsRow, { height: BAR_MAX_HEIGHT + 20 }]}>
        {bars.map((bar, i) => {
          const fillHeight = bar.rate > 0 ? Math.max(bar.rate * BAR_MAX_HEIGHT, 3) : 0;
          const fillColor  =
            bar.rate >= 0.8 ? Colors.green600 :
            bar.rate >= 0.5 ? Colors.green400 :
            bar.rate >  0   ? Colors.warning  :
            Colors.transparent;

          return (
            <View key={i} style={chartStyles.barColumn}>
              {/* Bar background + fill */}
              <View style={[chartStyles.barBg, { height: BAR_MAX_HEIGHT }]}>
                <View style={[chartStyles.barFill, { height: fillHeight, backgroundColor: fillColor }]} />
              </View>
              {/* X-axis label */}
              <Text style={chartStyles.barLabel} numberOfLines={1}>
                {bar.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: Colors.green600 }]} />
          <Text style={chartStyles.legendText}>≥80%</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: Colors.green400 }]} />
          <Text style={chartStyles.legendText}>50–79%</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: Colors.warning }]} />
          <Text style={chartStyles.legendText}>&lt;50%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Per-task stat row ────────────────────────────────────────────────────────

function TaskStatRow({ stat }: { stat: TaskStat }) {
  const pct = Math.round(stat.rate * 100);
  const barColor =
    stat.rate >= 0.8 ? Colors.green600 :
    stat.rate >= 0.5 ? Colors.green400 :
    Colors.warning;

  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{stat.icon}</Text>
      <View style={rowStyles.meta}>
        <View style={rowStyles.nameRow}>
          <Text style={rowStyles.name} numberOfLines={1}>{stat.name}</Text>
          <Text style={[rowStyles.pct, { color: barColor }]}>{pct}%</Text>
        </View>
        {/* Mini progress bar */}
        <View style={rowStyles.track}>
          <View style={[rowStyles.trackFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
        <Text style={rowStyles.sub}>{stat.completed} of {stat.scheduled} days</Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SummaryScreen() {
  const childProfiles    = useChildStore(s => s.childProfiles);
  const selectedChildId  = useChildStore(s => s.selectedChildId);
  const setSelectedChildId = useChildStore(s => s.setSelectedChildId);

  const [view, setView] = useState<SummaryView>('weekly');

  const { chartBars, taskStats, totalCompleted, totalScheduled, loading, reload } =
    useSummary(selectedChildId, view);

  // Reload data every time the screen comes into focus
  useFocusEffect(useCallback(() => { reload(); }, [selectedChildId, view]));

  const selectedChild = childProfiles.find(c => c.id === selectedChildId);
  const hasData       = taskStats.length > 0;
  const overallPct    = totalScheduled === 0 ? 0 : Math.round((totalCompleted / totalScheduled) * 100);
  const viewLabel     = view === 'weekly' ? 'this week' : view === 'monthly' ? 'this month' : 'this year';

  return (
    <View style={styles.root}>

      {/* ── Top chrome ─────────────────────────────────────────────────────── */}
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.topArea}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Summary</Text>
        </View>

        {/* Child tab strip */}
        {childProfiles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childTabsContent}
            style={styles.childTabs}
          >
            {childProfiles.map(child => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childTab, selectedChildId === child.id && styles.childTabSelected]}
                onPress={() => setSelectedChildId(child.id)}
              >
                <Text style={[styles.childTabText, selectedChildId === child.id && styles.childTabTextSelected]}>
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Weekly / Monthly / Annual switcher */}
        <View style={styles.viewSwitcher}>
          {VIEWS.map(v => (
            <TouchableOpacity
              key={v.id}
              style={[styles.viewBtn, view === v.id && styles.viewBtnActive]}
              onPress={() => setView(v.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewBtnText, view === v.id && styles.viewBtnTextActive]}>
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </SafeAreaView>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator color={Colors.green600} size="large" />
        </View>
      ) : !selectedChild || !hasData ? (
        <View style={styles.centerFlex}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>
            {!selectedChild
              ? 'Add a child profile to see their summary.'
              : `Complete some tasks ${viewLabel} to see stats here.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Overall rate */}
          <View style={styles.statCard}>
            <Text style={styles.statPct}>{overallPct}%</Text>
            <Text style={styles.statLabel}>of scheduled tasks completed {viewLabel}</Text>
            <Text style={styles.statSub}>{totalCompleted} completed · {totalScheduled} scheduled</Text>
          </View>

          {/* Bar chart */}
          <View style={styles.chartSection}>
            <BarChart bars={chartBars} />
          </View>

          {/* Per-task list */}
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>By habit</Text>
            {taskStats.map(stat => (
              <TaskStatRow key={stat.taskId} stat={stat} />
            ))}
          </View>
        </ScrollView>
      )}

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  topArea: {
    backgroundColor: Colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  centerFlex: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xs,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize:   Typography.size['2xl'],
    color:      Colors.green700,
  },

  // Child tab strip
  childTabs: {
    flexGrow: 0,
  },
  childTabsContent: {
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.sm,
    gap:               Spacing.sm,
  },
  childTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    borderWidth:       1.5,
    borderColor:       Colors.border,
    backgroundColor:   Colors.white,
  },
  childTabSelected: {
    backgroundColor: Colors.green700,
    borderColor:     Colors.green700,
  },
  childTabText: {
    fontFamily: 'Nunito_700Bold',
    fontSize:   Typography.size.base,
    color:      Colors.textPrimary,
  },
  childTabTextSelected: {
    color: Colors.white,
  },

  // View switcher
  viewSwitcher: {
    flexDirection:     'row',
    marginHorizontal:  Spacing.xl,
    marginTop:         Spacing.sm,
    marginBottom:      Spacing.md,
    backgroundColor:   Colors.bgSecondary,
    borderRadius:      Radius.lg,
    padding:           3,
  },
  viewBtn: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: Spacing.sm,
    borderRadius:   Radius.md,
  },
  viewBtnActive: {
    backgroundColor: Colors.white,
  },
  viewBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize:   Typography.size.sm,
    color:      Colors.textMuted,
  },
  viewBtnTextActive: {
    fontFamily: 'Nunito_700Bold',
    color:      Colors.green700,
  },

  // Scroll content
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // Overall stat card
  statCard: {
    marginHorizontal: Spacing.xl,
    marginTop:        Spacing.md,
    backgroundColor:  Colors.bgSecondary,
    borderRadius:     Radius.xl,
    padding:          Spacing['2xl'],
    alignItems:       'center',
    gap:              Spacing.xs,
  },
  statPct: {
    fontFamily: 'Nunito_900Black',
    fontSize:   Typography.size['4xl'],
    color:      Colors.green700,
    lineHeight: Typography.size['4xl'] * 1.1,
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize:   Typography.size.base,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  statSub: {
    fontFamily: 'Nunito_500Medium',
    fontSize:   Typography.size.sm,
    color:      Colors.textMuted,
    textAlign:  'center',
  },

  // Chart section
  chartSection: {
    marginTop:        Spacing.xl,
    marginHorizontal: Spacing.xl,
  },

  // Task section
  taskSection: {
    marginTop:        Spacing.xl,
    marginHorizontal: Spacing.xl,
    gap:              Spacing.md,
  },
  sectionTitle: {
    fontFamily:    'Nunito_700Bold',
    fontSize:      Typography.size.sm,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  Spacing.xs,
  },

  // Empty state
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize:   Typography.size.xl,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  emptyText: {
    fontFamily:  'Nunito_500Medium',
    fontSize:    Typography.size.base,
    color:       Colors.textSecondary,
    textAlign:   'center',
    lineHeight:  Typography.size.base * 1.5,
  },
});

// ─── Bar chart styles ─────────────────────────────────────────────────────────

const chartStyles = StyleSheet.create({
  wrapper: {
    gap: Spacing.md,
  },
  barsRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
  },
  barColumn: {
    flex:        1,
    alignItems:  'center',
    gap:         4,
  },
  barBg: {
    width:           '75%',
    backgroundColor: Colors.bgTertiary,
    borderRadius:    Radius.sm,
    justifyContent:  'flex-end',
    overflow:        'hidden',
  },
  barFill: {
    width:        '100%',
    borderRadius: Radius.sm,
  },
  barLabel: {
    fontFamily: 'Nunito_500Medium',
    fontSize:   9,
    color:      Colors.textMuted,
    textAlign:  'center',
  },
  legend: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  legendDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Nunito_500Medium',
    fontSize:   Typography.size.xs,
    color:      Colors.textMuted,
  },
});

// ─── Task stat row styles ─────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.white,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  icon: {
    fontSize: 28,
    width:    36,
    textAlign: 'center',
  },
  meta: {
    flex: 1,
    gap:  Spacing.xs,
  },
  nameRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  name: {
    flex:       1,
    fontFamily: 'Nunito_700Bold',
    fontSize:   Typography.size.base,
    color:      Colors.textPrimary,
    marginRight: Spacing.sm,
  },
  pct: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize:   Typography.size.base,
  },
  track: {
    height:          6,
    backgroundColor: Colors.bgTertiary,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  trackFill: {
    height:       6,
    borderRadius: Radius.full,
  },
  sub: {
    fontFamily: 'Nunito_500Medium',
    fontSize:   Typography.size.xs,
    color:      Colors.textMuted,
  },
});
