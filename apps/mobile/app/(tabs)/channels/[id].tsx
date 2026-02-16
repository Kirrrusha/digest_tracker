import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChannel, useChannelPosts } from "../../../src/hooks";

export default function ChannelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      <View style={styles.header}>
        <Text variant="titleLarge">{channel?.name}</Text>
        <Text variant="bodySmall" style={styles.url}>
          {channel?.url}
        </Text>
      </View>

      <FlatList
        data={postsData?.posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {item.title && <Card.Title title={item.title} />}
            <Card.Content>
              <Text numberOfLines={4}>{item.content}</Text>
              <Text variant="bodySmall" style={styles.date}>
                {new Date(item.publishedAt).toLocaleDateString("ru")}
              </Text>
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
  header: { padding: 16 },
  url: { opacity: 0.6, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: {},
  date: { marginTop: 8, opacity: 0.5 },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
});
