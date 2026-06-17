import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import {
  Colors,
  StageColors,
  Typography,
  Spacing,
  Radius,
  Layout,
} from '../theme';
import type { HabitStage } from '../theme';

interface Props {
  taskIcon: string;
  taskName: string;
  stage: HabitStage;
  onPress: () => void;
}

export function HabitCard({ taskIcon, taskName, stage, onPress }: Props) {
  const cfg = StageColors[stage];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cfg.bg }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{taskIcon}</Text>
      <View style={styles.textGroup}>
        <Text style={styles.taskName} numberOfLines={1}>
          {taskName}
        </Text>
        <Text style={[styles.stageLabel, { color: cfg.text }]}>
          {cfg.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.habitCardMinHeight,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  icon: {
    fontSize: 28,
  },
  textGroup: {
    flex: 1,
    gap: Spacing.xs,
  },
  taskName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.md,
    color: Colors.textPrimary,
  },
  stageLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
  },
});
