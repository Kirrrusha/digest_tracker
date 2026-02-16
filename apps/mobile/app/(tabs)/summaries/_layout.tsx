import { Stack } from "expo-router";

export default function SummariesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Саммари" }} />
      <Stack.Screen name="[id]" options={{ title: "Саммари" }} />
    </Stack>
  );
}
