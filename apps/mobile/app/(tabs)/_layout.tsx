import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#171717",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: "Каналы",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="rss" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="summaries"
        options={{
          title: "Саммари",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="text-box-multiple" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
