import { useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChannel, useGenerateSummaryForChannel } from "../../../src/hooks";

export default function ChannelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: channel, isLoading: channelLoading } = useChannel(id);
  const generateSummary = useGenerateSummaryForChannel();

  if (channelLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
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
        <Button
          mode="contained"
          icon="creation"
          onPress={() => generateSummary.mutate(id)}
          loading={generateSummary.isPending}
          disabled={generateSummary.isPending}
          style={styles.summaryBtn}
          compact
        >
          Сгенерировать саммари
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },
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
  summaryBtn: { marginTop: 12, alignSelf: "flex-start" },
});
