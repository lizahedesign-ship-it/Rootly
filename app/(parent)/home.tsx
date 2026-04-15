import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useChildStore } from '../../src/store/childStore';
import { useChildProfile } from '../../src/hooks/useChildProfile';
import { usePin } from '../../src/hooks/usePin';
import { PinModal } from '../../src/components/PinModal';

export default function ParentHomeScreen() {
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const userId = useAuthStore((s) => s.currentUser?.id);
  const childProfiles = useChildStore((s) => s.childProfiles);
  const selectedChildId = useChildStore((s) => s.selectedChildId);
  const setSelectedChildId = useChildStore((s) => s.setSelectedChildId);
  const setIsChildMode = useChildStore((s) => s.setIsChildMode);
  const { loadProfiles } = useChildProfile();
  const { hasPin } = usePin();
  const [isLoading, setIsLoading] = useState(true);
  const [showPinSetup, setShowPinSetup] = useState(false);

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.appName}>Rootly</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

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
        /* ── Child tabs + content ── */
        <View style={styles.flex}>
          {/* Tab strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabStrip}
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

            {childProfiles.length < 4 && (
              <TouchableOpacity
                style={styles.addTab}
                onPress={() => router.push('/(parent)/create-profile')}
              >
                <Text style={styles.addTabText}>＋ Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Content area — habit health cards added in Slice 9 */}
          <View style={styles.contentArea}>
            {selectedChild && (
              <>
                <Text style={styles.greeting}>{selectedChild.name}'s habits</Text>
                <Text style={styles.placeholder}>Habit cards coming in Slice 9</Text>
              </>
            )}
          </View>

          {/* "Hand to [child]" CTA */}
          {selectedChild && (
            <TouchableOpacity
              style={styles.handToChildBtn}
              onPress={handleHandToChild}
              activeOpacity={0.85}
            >
              <Text style={styles.handToChildText}>
                Hand to {selectedChild.name}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* PIN setup modal — shown first time parent enters child mode */}
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
    </SafeAreaView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  appName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size['2xl'],
    color: Colors.green700,
  },
  signOutText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
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
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Nunito_500Medium',
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
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
  // ── Tab strip ──────────────────────────────────────────────────
  tabStrip: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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
  tabText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.base,
    color: Colors.textPrimary,
  },
  tabTextSelected: {
    color: Colors.white,
  },
  addTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.borderMedium,
    backgroundColor: Colors.bgSecondary,
  },
  addTabText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  // ── Hand to child button ───────────────────────────────────────
  handToChildBtn: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.green700,
    alignItems: 'center',
  },
  handToChildText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: Typography.size.base,
    color: Colors.white,
  },
  // ── Content area ───────────────────────────────────────────────
  contentArea: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: 'Nunito_700Bold',
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  placeholder: {
    fontFamily: 'Nunito_500Medium',
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
});
