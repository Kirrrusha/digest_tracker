import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeleteSummary, useSummary } from "../../../src/hooks";

export default function SummaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: summary, isLoading } = useSummary(id);
  const deleteSummary = useDeleteSummary();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!summary) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          {new Date(summary.createdAt).toLocaleDateString("ru", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Text>

        <Text variant="bodySmall" style={styles.period}>
          {summary.period === "DAILY" ? "Дневной дайджест" : "Недельный дайджест"} •{" "}
          {summary.postsCount} постов
        </Text>

        <View style={styles.topics}>
          {summary.topics.map((topic) => (
            <Chip key={topic} compact style={styles.chip}>
              {topic}
            </Chip>
          ))}
        </View>

        <Markdown>{summary.content}</Markdown>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="delete"
          textColor="#ef4444"
          onPress={async () => {
            await deleteSummary.mutateAsync(id);
            router.back();
          }}
          loading={deleteSummary.isPending}
        >
          Удалить
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 80 },
  title: { fontWeight: "bold", marginBottom: 4 },
  period: { opacity: 0.6, marginBottom: 12 },
  topics: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 },
  chip: {},
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
});
