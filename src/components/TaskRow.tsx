import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, GestureResponderEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Layout, Shadow } from '../theme';
import type { TaskItem } from '../hooks/useTasks';

interface Props {
  task: TaskItem;
  onComplete: (taskId: string, origin: { x: number; y: number }) => void;
  onUncomplete: (taskId: string) => void;
  onShowToast: (message: string) => void;
}

const CIRCLE = Layout.childCircleSize; // 44px

export function TaskRow({ task, onComplete, onUncomplete, onShowToast }: Props) {
  const { id, name, icon, isCompleted } = task;

  // Bounce scale when task is completed
  const circleScale = useRef(new Animated.Value(1)).current;
  const prevCompleted = useRef(isCompleted);
  useEffect(() => {
    if (!prevCompleted.current && isCompleted) {
      Animated.sequence([
        Animated.timing(circleScale, { toValue: 1.28, duration: 140, useNativeDriver: true }),
        Animated.spring(circleScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 200,
        }),
      ]).start();
    }
    prevCompleted.current = isCompleted;
  }, [isCompleted]);

  function handleCirclePress(e: GestureResponderEvent) {
    if (isCompleted) { onUncomplete(id); onShowToast('Task unchecked'); return; }
    const { pageX, pageY } = e.nativeEvent;
    onComplete(id, { x: pageX, y: pageY });
  }

  function handleRowPress(e: GestureResponderEvent) {
    if (isCompleted) return;
    const { pageX, pageY } = e.nativeEvent;
    onComplete(id, { x: pageX, y: pageY });
  }

  return (
    <View style={styles.row}>
      {/* Circle — tap to complete or uncomplete */}
      <View style={styles.circleWrapper}>
        <TouchableOpacity
          onPress={handleCirclePress}
          activeOpacity={0.65}
        >
          <Animated.View
            style={[
              styles.circle,
              isCompleted ? styles.circleCompleted : styles.circleEmpty,
              { transform: [{ scale: circleScale }] },
            ]}
          >
            {isCompleted && <Feather name="check" size={20} color={Colors.white} />}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Task info — tapping the label row also completes the task */}
      <TouchableOpacity
        style={styles.taskInfo}
        onPress={handleRowPress}
        activeOpacity={isCompleted ? 1 : 0.6}
      >
        <Text style={styles.taskIcon}>{icon}</Text>
        <Text
          style={[styles.taskName, isCompleted && styles.taskNameDone]}
          numberOfLines={2}
        >
          {name}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    minHeight: Layout.childTaskRowHeight,
  },
  circleWrapper: {
    marginRight: Spacing.lg,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmpty: {
    borderWidth: 2.5,
    borderColor: Colors.green400,
    backgroundColor: Colors.white,
  },
  circleCompleted: {
    backgroundColor: Colors.green500,
    ...Shadow.checkmark,
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  taskIcon: {
    fontSize: Typography.size['2xl'],
  },
  taskName: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
    lineHeight: Typography.size.md * 1.4,
  },
  taskNameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
