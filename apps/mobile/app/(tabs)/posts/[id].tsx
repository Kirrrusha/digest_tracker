import { useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Divider, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePost } from "../../../src/hooks";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: post, isLoading } = usePost(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.meta}>
          <Chip compact style={styles.channelChip}>
            {post.channelName}
          </Chip>
          <Chip compact style={styles.typeChip}>
            {post.channelType === "telegram" ? "TG" : "RSS"}
          </Chip>
          <Text variant="bodySmall" style={styles.date}>
            {new Date(post.publishedAt).toLocaleDateString("ru", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {post.title && (
          <Text variant="headlineSmall" style={styles.title}>
            {post.title}
          </Text>
        )}

        {post.author && (
          <Text variant="bodySmall" style={styles.author}>
            Автор: {post.author}
          </Text>
        )}

        <Divider style={styles.divider} />

        <Text variant="bodyMedium" style={styles.body}>
          {post.contentPreview}
        </Text>

        {post.url && (
          <Button
            mode="outlined"
            icon="open-in-new"
            onPress={() => post.url && Linking.openURL(post.url)}
            style={styles.linkButton}
          >
            Открыть источник
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  channelChip: {},
  typeChip: {},
  date: { opacity: 0.5 },
  title: { fontWeight: "bold", lineHeight: 30 },
  author: { opacity: 0.6 },
  divider: { marginVertical: 4 },
  body: { lineHeight: 22 },
  linkButton: { marginTop: 8, alignSelf: "flex-start" },
});
