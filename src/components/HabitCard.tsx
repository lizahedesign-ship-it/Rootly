import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Colors,
  StageColors,
  Typography,
  Spacing,
  Radius,
  Shadow,
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
      style={[styles.card, { backgroundColor: cfg.bg }, Shadow.sm]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{taskIcon}</Text>
      <View style={styles.textGroup}>
        <Text style={styles.taskName} numberOfLines={1}>
          {taskName}
        </Text>
        <Text style={[styles.stageLabel, { color: cfg.text }]}>
          {cfg.emoji} {cfg.label}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={cfg.text} style={{ opacity: 0.45 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.habitCardMinHeight,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
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
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  stageLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: Typography.size.sm,
  },
});
