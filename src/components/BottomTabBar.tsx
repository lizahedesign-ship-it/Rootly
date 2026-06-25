import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

export type TabId = 'home' | 'records' | 'summary' | 'settings';

const TABS: Array<{ id: TabId; label: string; featherIcon: string; route: string }> = [
  { id: 'home',     label: 'Home',     featherIcon: 'home',        route: '/(parent)/(tabs)/home' },
  { id: 'records',  label: 'Milestones',  featherIcon: 'list',        route: '/(parent)/(tabs)/records' },
  { id: 'summary',  label: 'Summary',  featherIcon: 'bar-chart-2', route: '/(parent)/(tabs)/summary' },
  { id: 'settings', label: 'Settings', featherIcon: 'settings',    route: '/(parent)/(tabs)/settings' },
];

const COLOR_ACTIVE   = Colors.green700; // #2D6A4F
const COLOR_INACTIVE = Colors.textPrimary; // #1A2E1F — matches habit card title

interface Props {
  activeTab: TabId;
}

export function BottomTabBar({ activeTab }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const color    = isActive ? COLOR_ACTIVE : COLOR_INACTIVE;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => {
                if (!isActive) router.navigate(tab.route as any);
              }}
              activeOpacity={0.7}
            >
              <Feather name={tab.featherIcon as any} size={22} color={color} />
              <Text style={[styles.label, { color }]}>{tab.label}</Text>
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
    borderTopWidth:  0.5,
    borderTopColor:  'rgba(0,0,0,0.1)',
  },
  bar: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize:   Typography.size.xs,
  },
});
