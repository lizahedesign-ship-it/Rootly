import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { useChildStore } from '../store/childStore';
import { PinModal } from '../components/PinModal';

export default function ChildHomeScreen() {
  const router = useRouter();
  const childProfiles = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const setIsChildMode = useChildStore((s) => s.setIsChildMode);
  const [showPin, setShowPin] = useState(false);

  const child = childProfiles.find((c) => c.id === selectedChildId);

  function handleExitSuccess() {
    setShowPin(false);
    setIsChildMode(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Hi, {child?.name ?? 'there'}! 👋</Text>
        <Text style={styles.placeholder}>Tasks coming in Slice 6</Text>
      </View>

      {/* "Parent exit · PIN" — always at bottom */}
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
  greeting: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  placeholder: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.base,
    color: Colors.textMuted,
  },
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
