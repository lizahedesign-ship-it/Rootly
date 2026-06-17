import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, StageColors, Typography, Spacing, Radius } from '../../../src/theme';
import { supabase } from '../../../src/services/supabase';
import { useAuthStore } from '../../../src/store/authStore';
import { useChildStore } from '../../../src/store/childStore';
import { useChildProfile } from '../../../src/hooks/useChildProfile';
import { usePin } from '../../../src/hooks/usePin';
import { useHabitHealth } from '../../../src/hooks/useHabitHealth';
import { useGraduatedHabits } from '../../../src/hooks/useGraduatedHabits';
import { PinModal } from '../../../src/components/PinModal';
import { HabitCard } from '../../../src/components/HabitCard';

export default function ParentHomeScreen() {
  const router = useRouter();

  const userId = useAuthStore((s) => s.currentUser?.id);
  const childProfiles = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useChildStore((s) => s.setSelectedChildId);
  const setIsChildMode = useChildStore((s) => s.setIsChildMode);
  const { loadProfiles } = useChildProfile();
  const { hasPin } = usePin();
  const { habits, loading: habitsLoading, reload: reloadHabits } = useHabitHealth(selectedChildId);
  const { graduatedHabits, reload: reloadGraduated } = useGraduatedHabits(selectedChildId);
  const [isLoading, setIsLoading] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    loadProfiles().finally(() => {
      if (mounted) setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
    // loadProfiles captures userId internally; userId dep ensures reload on user change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload both habit lists when returning from habit-detail (e.g. after graduating).
  // The hooks' own useEffects handle initial load and child-tab switches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { reloadHabits(); reloadGraduated(); }, [selectedChildId]));

  async function handleRestore(taskId: string) {
    setRestoringId(taskId);
    const { error } = await supabase
      .from('task')
      .update({ is_graduated: false, graduated_at: null })
      .eq('id', taskId);

    if (error) {
      Alert.alert('Error', "Couldn't restore this habit. Please try again.");
    } else {
      await Promise.all([reloadHabits(), reloadGraduated()]);
    }
    setRestoringId(null);
  }

  const selectedChild = childProfiles.find((c) => c.id === selectedChildId);

  const handleHandToChild = async () => {
    if (!selectedChild) return;
    const pinExists = await hasPin();
    if (pinExists) {
      setIsChildMode(true);
      router.push('/(parent)/child-home');
    } else {
      setShowPinSetup(true);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.green600} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>


          {childProfiles.length === 0 ? (
            /* ── Empty state ── */
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Add your first child</Text>
              <Text style={styles.emptySubtitle}>
                Create a profile to start tracking habits together.
              </Text>
              <TouchableOpacity
                style={styles.addFirstBtn}
                onPress={() => router.push('/(parent)/create-profile')}
              >
                <Text style={styles.addFirstBtnText}>Create child profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Child tabs + content — flat siblings, no wrapper View ── */
            <>
              {/* Tab strip — immediately below header */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                alwaysBounceVertical={false}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingVertical: 4,
                  gap: 8,
                  alignItems: 'center',
                  height: 56,
                }}
                style={{ flexShrink: 0, maxHeight: 56 }}
              >
                {childProfiles.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.tab,
                      selectedChildId === child.id && styles.tabSelected,
                    ]}
                    onPress={() => setSelectedChildId(child.id)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedChildId === child.id && styles.tabTextSelected,
                      ]}
                    >
                      {child.name}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.tabAdd}
                  onPress={() => router.push('/(parent)/create-profile')}
                  activeOpacity={0.7}
                >
                  <Feather name="plus" size={16} color={Colors.green700} />
                </TouchableOpacity>

              </ScrollView>

              {/* Habit health cards — flex:1 fills remaining space */}
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.contentArea}
                showsVerticalScrollIndicator={false}
              >
                {selectedChild && (
                  <>
                    {habitsLoading ? (
                      <ActivityIndicator color={Colors.green600} style={styles.loader} />
                    ) : habits.length === 0 ? (
                      <Text style={styles.noHabitsText}>
                        No habits yet. Add a task to get started.
                      </Text>
                    ) : (
                      habits.map((h) => (
                        <HabitCard
                          key={h.taskId}
                          taskIcon={h.taskIcon}
                          taskName={h.taskName}
                          stage={h.stage}
                          onPress={() => router.push(`/(parent)/habit-detail/${h.taskId}`)}
                        />
                      ))
                    )}

                    {/* ── Graduated section ──────────────────────────────── */}
                    {graduatedHabits.length > 0 && (
                      <>
                        <Text style={styles.graduatedHeader}>Graduated 🎓</Text>
                        {graduatedHabits.map((h) => (
                          <View key={h.taskId} style={styles.graduatedRow}>
                            <Text style={styles.graduatedIcon}>{h.taskIcon}</Text>
                            <View style={styles.graduatedMeta}>
                              <Text style={styles.graduatedName}>{h.taskName}</Text>
                              <Text style={styles.graduatedLabel}>Graduated</Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.restoreBtn,
                                restoringId === h.taskId && styles.restoreBtnDisabled,
                              ]}
                              onPress={() => handleRestore(h.taskId)}
                              disabled={restoringId !== null}
                              activeOpacity={0.7}
                            >
                              {restoringId === h.taskId ? (
                                <ActivityIndicator size="small" color={Colors.textSecondary} />
                              ) : (
                                <Text style={styles.restoreBtnText}>Restore</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              {selectedChild && (
                <View style={styles.bottomActions}>
                  <TouchableOpacity
                    style={styles.addHabitBtn}
                    onPress={() => router.push('/(parent)/create-task')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addHabitBtnText}>Add a habit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.handToChildBtn}
                    onPress={handleHandToChild}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.handToChildText}>
                      Hand to {selectedChild.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

        </View>
      </SafeAreaView>

      {/* PIN setup modal — outside SafeAreaView, no layout influence */}
      <PinModal
        visible={showPinSetup}
        mode="setup"
        onSuccess={() => {
          setShowPinSetup(false);
          setIsChildMode(true);
          router.push('/(parent)/child-home');
        }}
        onCancel={() => setShowPinSetup(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  // ── Empty state ────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.md,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.size.base * 1.5,
  },
  addFirstBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.green700,
    borderRadius: Radius.full,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['3xl'],
  },
  addFirstBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
  // ── Tab strip ──────────────────────────────────────────────────
  tabStrip: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    paddingBottom: 12,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tabSelected: {
    backgroundColor: Colors.green700,
    borderColor: Colors.green700,
  },
  tabAdd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.green300,
    backgroundColor: Colors.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  tabTextSelected: {
    color: Colors.white,
  },
  // ── Bottom actions ─────────────────────────────────────────────
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    gap: 8,
  },
  addHabitBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.green600,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addHabitBtnText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.green700,
  },
  // ── Hand to child button ───────────────────────────────────────
  handToChildBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: Colors.green700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handToChildText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
  // ── Content area ───────────────────────────────────────────────
  contentArea: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 0,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  loader: {
    marginTop: Spacing['2xl'],
  },
  noHabitsText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },

  // ── Graduated section ───────────────────────────────────────────
  graduatedHeader: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  graduatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StageColors.graduated.bg,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    opacity: 0.75,
    gap: Spacing.md,
  },
  graduatedIcon: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  graduatedMeta: {
    flex: 1,
    gap: 2,
  },
  graduatedName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  graduatedLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  restoreBtn: {
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    borderRadius: Radius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    minWidth: 72,
    alignItems: 'center',
  },
  restoreBtnDisabled: {
    opacity: 0.5,
  },
  restoreBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
});
