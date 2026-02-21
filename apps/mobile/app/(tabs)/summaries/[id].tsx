import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { ActivityIndicator, Button, Card, Chip, Divider, Text } from "react-native-paper";
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

        {summary.sources && summary.sources.length > 0 && (
          <>
            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={styles.sourcesTitle}>
              Источники ({summary.sources.length})
            </Text>
            {summary.sources.map((source) => (
              <Card key={source.id} style={styles.sourceCard}>
                <Card.Content>
                  <View style={styles.sourceHeader}>
                    <Chip compact style={styles.sourceChip}>
                      {source.channelName}
                    </Chip>
                    <Text variant="bodySmall" style={styles.sourceDate}>
                      {new Date(source.publishedAt).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  {source.title && (
                    <Text variant="bodyMedium" style={styles.sourceTitle} numberOfLines={2}>
                      {source.title}
                    </Text>
                  )}
                  {source.contentPreview && (
                    <Text variant="bodySmall" style={styles.sourcePreview} numberOfLines={2}>
                      {source.contentPreview}
                    </Text>
                  )}
                </Card.Content>
                {source.url && (
                  <Card.Actions>
                    <Button
                      compact
                      icon="open-in-new"
                      onPress={() => source.url && Linking.openURL(source.url)}
                    >
                      Открыть
                    </Button>
                  </Card.Actions>
                )}
              </Card>
            ))}
          </>
        )}
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
  divider: { marginVertical: 16 },
  sourcesTitle: { fontWeight: "600", marginBottom: 12 },
  sourceCard: { marginBottom: 8 },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  sourceChip: {},
  sourceDate: { opacity: 0.5 },
  sourceTitle: { fontWeight: "500", marginBottom: 4 },
  sourcePreview: { opacity: 0.6 },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
});
