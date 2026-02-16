import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Card, Chip, FAB, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDashboardStats, useSummaries } from "../../src/hooks";

export default function DashboardScreen() {
  const router = useRouter();
  const { data: stats, isLoading: statsLoading, refetch } = useDashboardStats();
  const { data: summariesData } = useSummaries();

  const latestSummary = summariesData?.summaries?.[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={statsLoading} onRefresh={refetch} />}
      >
        <Text variant="headlineMedium" style={styles.header}>
          DevDigest
        </Text>

        {statsLoading ? (
          <ActivityIndicator />
        ) : (
          <Card style={styles.card}>
            <Card.Title title="Сводка за сегодня" />
            <Card.Content>
              <Text>Каналов: {stats?.channelsCount ?? 0}</Text>
              <Text>Постов сегодня: {stats?.postsToday ?? 0}</Text>
              <Text>Саммари: {stats?.summariesToday ?? 0}</Text>
            </Card.Content>
          </Card>
        )}

        {latestSummary && (
          <Card
            style={styles.card}
            onPress={() => router.push(`/(tabs)/summaries/${latestSummary.id}`)}
          >
            <Card.Title title="Последнее саммари" />
            <Card.Content>
              <Text numberOfLines={3}>{latestSummary.content}</Text>
              <ScrollView horizontal style={styles.chips}>
                {latestSummary.topics.map((topic) => (
                  <Chip key={topic} style={styles.chip} compact>
                    {topic}
                  </Chip>
                ))}
              </ScrollView>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push("/(tabs)/summaries")}
        label="Саммари"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 80,
  },
  header: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  card: {
    marginBottom: 8,
  },
  chips: {
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
