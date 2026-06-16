import { Tabs } from 'expo-router';
import { BottomTabBar, TabId } from '../../../src/components/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => {
        const routeName = props.state.routes[props.state.index].name as TabId;
        return <BottomTabBar activeTab={routeName} />;
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="summary" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
