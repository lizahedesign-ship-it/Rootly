import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../theme';

export type TabId = 'home' | 'records' | 'summary' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: string; route: string }> = [
  { id: 'home',     label: 'Home',     icon: '🏠', route: '/(parent)/(tabs)/home' },
  { id: 'records',  label: 'Records',  icon: '📋', route: '/(parent)/(tabs)/records' },
  { id: 'summary',  label: 'Summary',  icon: '📊', route: '/(parent)/(tabs)/summary' },
  { id: 'settings', label: 'Settings', icon: '⚙️', route: '/(parent)/(tabs)/settings' },
];

interface Props {
  activeTab: TabId;
}

export function BottomTabBar({ activeTab }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.bar}>
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => {
                if (!isActive) router.navigate(tab.route as any);
              }}
              activeOpacity={0.65}
            >
              <Text style={styles.icon}>{tab.icon}</Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bar: {
    flexDirection: 'row',
    paddingTop:    Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize:   Typography.size.xs,
    color:      Colors.textMuted,
  },
  labelActive: {
    color: Colors.green700,
  },
});
