import { Stack } from "expo-router";

export default function ChannelsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Каналы" }} />
      <Stack.Screen name="[id]" options={{ title: "Канал" }} />
    </Stack>
  );
}
