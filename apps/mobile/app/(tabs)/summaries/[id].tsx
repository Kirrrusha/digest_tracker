import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { ActivityIndicator, Button, Card, Chip, Divider, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeleteSummary, useRegenerateSummary, useSummary } from "../../../src/hooks";

export default function SummaryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: summary, isLoading } = useSummary(id);
  const deleteSummary = useDeleteSummary();
  const regenerateSummary = useRegenerateSummary(id);

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

        <Markdown
          style={{
            body: { color: theme.colors.onBackground, fontSize: 14, lineHeight: 22 },
            heading1: {
              fontSize: 20,
              fontWeight: "700",
              marginTop: 16,
              marginBottom: 8,
              color: theme.colors.onBackground,
            },
            heading2: {
              fontSize: 17,
              fontWeight: "700",
              marginTop: 14,
              marginBottom: 6,
              color: theme.colors.onBackground,
            },
            heading3: {
              fontSize: 15,
              fontWeight: "600",
              marginTop: 12,
              marginBottom: 4,
              color: theme.colors.onBackground,
            },
            bullet_list: { marginVertical: 4 },
            ordered_list: { marginVertical: 4 },
            list_item: { marginVertical: 2 },
            strong: { fontWeight: "700" },
            em: { fontStyle: "italic" },
            link: { color: theme.colors.primary },
            blockquote: {
              borderLeftWidth: 3,
              borderLeftColor: theme.colors.primary,
              paddingLeft: 12,
              marginLeft: 0,
              opacity: 0.8,
            },
            code_inline: {
              fontFamily: "monospace",
              backgroundColor: theme.colors.surfaceVariant,
              paddingHorizontal: 4,
              borderRadius: 3,
              fontSize: 13,
            },
            fence: {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: 6,
              padding: 12,
              marginVertical: 8,
            },
          }}
        >
          {summary.content}
        </Markdown>

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

        <Divider style={styles.divider} />
        <View style={styles.actions}>
          <Button
            mode="outlined"
            icon="refresh"
            onPress={() =>
              Alert.alert(
                "Перегенерировать саммари?",
                "Текущий текст будет заменён новым. Посты останутся те же.",
                [
                  { text: "Отмена", style: "cancel" },
                  { text: "Перегенерировать", onPress: () => regenerateSummary.mutate() },
                ]
              )
            }
            loading={regenerateSummary.isPending}
            disabled={regenerateSummary.isPending || deleteSummary.isPending}
          >
            Перегенерировать
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            textColor="#ef4444"
            onPress={() =>
              Alert.alert("Удалить саммари?", "Это действие нельзя отменить.", [
                { text: "Отмена", style: "cancel" },
                {
                  text: "Удалить",
                  style: "destructive",
                  onPress: async () => {
                    await deleteSummary.mutateAsync(id);
                    router.back();
                  },
                },
              ])
            }
            loading={deleteSummary.isPending}
            disabled={deleteSummary.isPending || regenerateSummary.isPending}
          >
            Удалить
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32 },
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
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
});
