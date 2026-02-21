import { useRouter } from "expo-router";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, IconButton, Text } from "react-native-paper";
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

        {stats?.topTopics && stats.topTopics.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Топ темы" />
            <Card.Content>
              <View style={styles.topicsGrid}>
                {stats.topTopics.map(({ topic, count }) => (
                  <View key={topic} style={styles.topicItem}>
                    <Chip compact style={styles.topicChip}>
                      {topic}
                    </Chip>
                    <Text variant="bodySmall" style={styles.topicCount}>
                      {count}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {stats?.recentPosts && stats.recentPosts.length > 0 && (
          <Card style={styles.card}>
            <Card.Title title="Последние посты" />
            <Card.Content style={styles.recentPostsContent}>
              {stats.recentPosts.map((post) => (
                <View key={post.id} style={styles.recentPost}>
                  <View
                    style={styles.recentPostInner}
                    onTouchEnd={() => router.push(`/(tabs)/posts/${post.id}`)}
                  >
                    <View style={styles.recentPostHeader}>
                      <Chip compact style={styles.recentChip}>
                        {post.channelName}
                      </Chip>
                      <Text variant="bodySmall" style={styles.recentDate}>
                        {new Date(post.publishedAt).toLocaleDateString("ru", {
                          day: "numeric",
                          month: "short",
                        })}
                      </Text>
                    </View>
                    {post.title ? (
                      <Text variant="bodyMedium" style={styles.recentTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                    ) : (
                      <Text variant="bodySmall" style={styles.recentPreview} numberOfLines={2}>
                        {post.contentPreview}
                      </Text>
                    )}
                  </View>
                  {post.url && (
                    <IconButton
                      icon="open-in-new"
                      size={16}
                      onPress={() => post.url && Linking.openURL(post.url)}
                    />
                  )}
                </View>
              ))}
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
              <ScrollView horizontal style={styles.chips} showsHorizontalScrollIndicator={false}>
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
    paddingBottom: 32,
  },
  header: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  card: {
    marginBottom: 8,
  },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  topicItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topicChip: {},
  topicCount: {
    opacity: 0.5,
  },
  recentPostsContent: {
    gap: 12,
  },
  recentPost: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  recentPostInner: {
    flex: 1,
    gap: 4,
  },
  recentPostHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  recentChip: {},
  recentDate: { opacity: 0.5 },
  recentTitle: { fontWeight: "500" },
  recentPreview: { opacity: 0.7 },
  chips: {
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
  },
});
