import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useChildStore } from '../store/childStore';
import { PinModal } from '../components/PinModal';
import { TaskRow } from '../components/TaskRow';
import { ConfettiOverlay } from '../components/ConfettiOverlay';
import { useTasks } from '../hooks/useTasks';

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Good morning, ${name}! ☀️`;
  if (h >= 12 && h < 17) return `Good afternoon, ${name}! 🌤`;
  if (h >= 17 && h < 21) return `Good evening, ${name}! 🌙`;
  return `Hi, ${name}! ⭐`;
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChildHomeScreen() {
  const router = useRouter();
  const childProfiles = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const setIsChildMode = useChildStore((s) => s.setIsChildMode);

  const child = childProfiles.find((c) => c.id === selectedChildId);
  const { tasks, loading, completeTask, uncompleteTask, completedCount, totalCount, allDone } =
    useTasks(selectedChildId);

  // Navigate to all-done screen when every task is complete.
  // Use a ref guard so we only push once per session; reset when tasks are unchecked.
  const allDoneNavigated = useRef(false);
  useEffect(() => {
    if (allDone && !allDoneNavigated.current) {
      allDoneNavigated.current = true;
      setTimeout(() => router.push('/(parent)/all-done'), 400);
    }
    if (!allDone) {
      allDoneNavigated.current = false;
    }
  }, [allDone]);

  // PIN modal
  const [showPin, setShowPin] = useState(false);

  // Confetti — mounts/unmounts to retrigger on each new completion
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 0, y: 0 });

  // Toast
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(message);
    toastOpacity.setValue(1);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 2000);
  }

  function handleComplete(taskId: string, origin: { x: number; y: number }) {
    completeTask(taskId);
    // Only start a new confetti burst if none is running
    if (!showConfetti) {
      setConfettiOrigin(origin);
      setShowConfetti(true);
    }
  }

  function handleExitSuccess() {
    setShowPin(false);
    setIsChildMode(false);
    router.back();
  }

  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const hasNoTasks = !loading && totalCount === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.dateLabel}>{getDateLabel()}</Text>
          <Text style={styles.greeting}>
            {getGreeting(child?.name ?? 'there')}
          </Text>
        </View>

        {/* ── Progress bar (no numbers shown to child) ── */}
        {totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {/* ── Task list or empty state ── */}
        {hasNoTasks ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>
              No tasks yet — ask a parent to set some up!
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onUncomplete={uncompleteTask}
                onShowToast={showToast}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Toast (invisible when opacity=0) ── */}
      <Animated.View
        style={[styles.toast, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* ── Confetti overlay ── */}
      {showConfetti && (
        <ConfettiOverlay
          origin={confettiOrigin}
          onDone={() => setShowConfetti(false)}
        />
      )}

      {/* ── "Parent exit · PIN" — fixed at bottom ── */}
      <TouchableOpacity
        style={styles.exitBtn}
        onPress={() => setShowPin(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.exitText}>Parent exit · PIN</Text>
      </TouchableOpacity>

      <PinModal
        visible={showPin}
        mode="verify"
        onSuccess={handleExitSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 3,
    borderColor: Colors.childModeBorder,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  dateLabel: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  greeting: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    lineHeight: Typography.size['2xl'] * 1.15,
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
    backgroundColor: Colors.green500,
  },

  // Task list
  taskList: {
    paddingTop: Spacing.xs,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingHorizontal: Spacing['3xl'],
  },
  emptyIcon: {
    fontSize: Typography.size['4xl'],
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.size.base * 1.5,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: Colors.green800,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  toastText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.white,
  },

  // Exit button
  exitBtn: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
  },
  exitText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
});
