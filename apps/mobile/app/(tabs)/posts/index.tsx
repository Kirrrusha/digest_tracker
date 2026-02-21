import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Linking, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChannels, usePosts } from "../../../src/hooks";
import type { Post } from "../../../src/types";

export default function PostsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [channelId, setChannelId] = useState<string | undefined>();

  const { data: channels } = useChannels();
  const { data, isLoading, refetch } = usePosts(page, channelId);

  const handleChannelFilter = (id: string | undefined) => {
    setChannelId(id);
    setPage(1);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.card} onPress={() => router.push(`/(tabs)/posts/${item.id}`)}>
      <Card.Content>
        <View style={styles.postHeader}>
          <Chip compact style={styles.sourceChip}>
            {item.channelName}
          </Chip>
          <Text variant="bodySmall" style={styles.date}>
            {new Date(item.publishedAt).toLocaleDateString("ru", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
        {item.title && (
          <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        )}
        {item.contentPreview && (
          <Text variant="bodySmall" style={styles.preview} numberOfLines={3}>
            {item.contentPreview}
          </Text>
        )}
      </Card.Content>
      {item.url && (
        <Card.Actions>
          <IconButton
            icon="open-in-new"
            size={18}
            onPress={() => item.url && Linking.openURL(item.url)}
          />
        </Card.Actions>
      )}
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal style={styles.filters} showsHorizontalScrollIndicator={false}>
        <Chip
          selected={!channelId}
          onPress={() => handleChannelFilter(undefined)}
          style={styles.filterChip}
        >
          Все каналы
        </Chip>
        {channels?.map((ch) => (
          <Chip
            key={ch.id}
            selected={channelId === ch.id}
            onPress={() => handleChannelFilter(ch.id)}
            style={styles.filterChip}
          >
            {ch.name}
          </Chip>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          onRefresh={() => {
            setPage(1);
            refetch();
          }}
          refreshing={isLoading}
          ListEmptyComponent={<Text style={styles.empty}>Нет постов</Text>}
          ListFooterComponent={
            data && data.hasMore ? (
              <View style={styles.pagination}>
                {page > 1 && (
                  <Chip onPress={() => setPage((p) => p - 1)} style={styles.pageChip}>
                    ← Назад
                  </Chip>
                )}
                <Text style={styles.pageText}>стр. {page}</Text>
                {data.hasMore && (
                  <Chip onPress={() => setPage((p) => p + 1)} style={styles.pageChip}>
                    Далее →
                  </Chip>
                )}
              </View>
            ) : page > 1 ? (
              <View style={styles.pagination}>
                <Chip onPress={() => setPage((p) => p - 1)} style={styles.pageChip}>
                  ← Назад
                </Chip>
                <Text style={styles.pageText}>стр. {page}</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filters: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: { marginRight: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {},
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sourceChip: {},
  date: { opacity: 0.5 },
  title: { fontWeight: "600", marginBottom: 4 },
  preview: { opacity: 0.7 },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
  },
  pageChip: {},
  pageText: { opacity: 0.6 },
});
