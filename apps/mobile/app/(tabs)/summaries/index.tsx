import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  FAB,
  Portal,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGenerateSummary, useSummaries, useSummaryTopics } from "../../../src/hooks";
import { useJobsStore } from "../../../src/stores/jobs";
import type { Summary } from "../../../src/types";

export default function SummariesScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState<string | undefined>();
  const { data, isLoading, refetch } = useSummaries(topic);
  const { data: allTopics = [] } = useSummaryTopics();
  const generateSummary = useGenerateSummary();
  const [showDialog, setShowDialog] = useState(false);
  const activeJobs = useJobsStore((s) => s.activeJobs);
  const hasActiveJobs = activeJobs.size > 0;

  const renderSummary = ({ item }: { item: Summary }) => (
    <Card style={styles.card} onPress={() => router.push(`/(tabs)/summaries/${item.id}`)}>
      <Card.Title
        title={new Date(item.createdAt).toLocaleDateString("ru", {
          day: "numeric",
          month: "long",
        })}
        subtitle={new Date(item.createdAt).toLocaleTimeString("ru", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      />
      <Card.Content>
        <Text numberOfLines={2}>{item.content}</Text>
        <View style={styles.chips}>
          {item.topics.slice(0, 3).map((t) => (
            <Chip
              key={t}
              compact
              style={[styles.chip, topic === t && styles.selectedChip]}
              onPress={() => setTopic(topic === t ? undefined : t)}
            >
              {t}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {allTopics.length > 0 && (
        <ScrollView horizontal style={styles.topicFilters} showsHorizontalScrollIndicator={false}>
          <Chip
            selected={!topic}
            onPress={() => setTopic(undefined)}
            style={styles.filterChip}
            compact
          >
            Все темы
          </Chip>
          {allTopics.map((t) => (
            <Chip
              key={t}
              selected={topic === t}
              onPress={() => setTopic(topic === t ? undefined : t)}
              style={styles.filterChip}
              compact
            >
              {t}
            </Chip>
          ))}
        </ScrollView>
      )}

      {hasActiveJobs && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator size="small" style={styles.bannerSpinner} />
          <Text variant="bodySmall" style={styles.bannerText}>
            Генерируется саммари...
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.summaries}
          keyExtractor={(item) => item.id}
          renderItem={renderSummary}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={<Text style={styles.empty}>Нет саммари</Text>}
        />
      )}

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Создать саммари</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={styles.generateDesc}>
              Саммари из непрочитанных сообщений выбранных каналов
            </Text>
            <Button
              mode="contained"
              onPress={async () => {
                await generateSummary.mutateAsync();
                setShowDialog(false);
              }}
              loading={generateSummary.isPending}
              disabled={generateSummary.isPending}
              style={styles.createButton}
            >
              Создать саммари
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)} disabled={generateSummary.isPending}>
              Отмена
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => setShowDialog(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topicFilters: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterChip: { marginRight: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  card: {},
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  chip: {},
  selectedChip: { opacity: 0.8 },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  generatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  bannerSpinner: {},
  bannerText: { opacity: 0.7 },
  generateDesc: { opacity: 0.5, marginBottom: 12 },
  createButton: { marginTop: 8 },
});
