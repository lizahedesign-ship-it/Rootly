import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

export type TabId = 'home' | 'records' | 'summary' | 'settings';

const TABS: Array<{ id: TabId; label: string; featherIcon: string; route: string }> = [
  { id: 'home',     label: 'Home',     featherIcon: 'home',        route: '/(parent)/(tabs)/home' },
  { id: 'records',  label: 'Records',  featherIcon: 'list',        route: '/(parent)/(tabs)/records' },
  { id: 'summary',  label: 'Summary',  featherIcon: 'bar-chart-2', route: '/(parent)/(tabs)/summary' },
  { id: 'settings', label: 'Settings', featherIcon: 'settings',    route: '/(parent)/(tabs)/settings' },
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
              <Feather
                name={tab.featherIcon as any}
                size={24}
                color={isActive ? Colors.green700 : Colors.textMuted}
              />
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
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize:   Typography.size.xs,
    color:      Colors.textMuted,
  },
  labelActive: {
    color: Colors.green700,
  },
});
