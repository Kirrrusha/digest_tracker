import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Linking, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChannel, useChannelPosts } from "../../../src/hooks";

export default function ChannelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: channel, isLoading: channelLoading } = useChannel(id);
  const { data: postsData, isLoading: postsLoading, refetch } = useChannelPosts(id);

  if (channelLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={postsData?.posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text variant="titleLarge" style={styles.channelName}>
                {channel?.name}
              </Text>
              {channel?.type && (
                <Chip compact style={styles.typeChip}>
                  {channel.type}
                </Chip>
              )}
            </View>
            {channel?.description && (
              <Text variant="bodySmall" style={styles.description}>
                {channel.description}
              </Text>
            )}
            <View style={styles.urlRow}>
              <Text variant="bodySmall" style={styles.url} numberOfLines={1}>
                {channel?.url}
              </Text>
              {channel?.url && (
                <IconButton
                  icon="open-in-new"
                  size={16}
                  onPress={() => channel.url && Linking.openURL(channel.url)}
                  style={styles.urlIcon}
                />
              )}
            </View>
            {channel?.postsCount !== undefined && (
              <Text variant="bodySmall" style={styles.postsCount}>
                Всего постов: {channel.postsCount}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/(tabs)/posts/${item.id}`)}>
            {item.title && <Card.Title title={item.title} titleNumberOfLines={2} />}
            <Card.Content>
              <Text numberOfLines={4}>{item.contentPreview}</Text>
              <View style={styles.postFooter}>
                <Text variant="bodySmall" style={styles.date}>
                  {new Date(item.publishedAt).toLocaleDateString("ru")}
                </Text>
                {item.url && (
                  <IconButton
                    icon="open-in-new"
                    size={16}
                    onPress={() => item.url && Linking.openURL(item.url)}
                  />
                )}
              </View>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={postsLoading}
        ListEmptyComponent={<Text style={styles.empty}>Нет постов</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { padding: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  channelName: { fontWeight: "bold", flex: 1 },
  typeChip: {},
  description: { opacity: 0.7, marginBottom: 4 },
  urlRow: { flexDirection: "row", alignItems: "center" },
  url: { opacity: 0.5, flex: 1 },
  urlIcon: { margin: 0 },
  postsCount: { opacity: 0.5, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: {},
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  date: { opacity: 0.5 },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
});
