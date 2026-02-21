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

import { useGenerateSummary, useSummaries } from "../../../src/hooks";
import type { Summary } from "../../../src/types";

const PERIOD_OPTIONS = [
  { label: "Все", value: undefined as string | undefined },
  { label: "Дневные", value: "DAILY" as string | undefined },
  { label: "Недельные", value: "WEEKLY" as string | undefined },
];

export default function SummariesScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<string | undefined>();
  const [topic, setTopic] = useState<string | undefined>();
  const { data, isLoading, refetch } = useSummaries(period, topic);
  const generateSummary = useGenerateSummary();
  const [showDialog, setShowDialog] = useState(false);

  const allTopics = Array.from(new Set(data?.summaries.flatMap((s) => s.topics) ?? [])).sort();

  const renderSummary = ({ item }: { item: Summary }) => (
    <Card style={styles.card} onPress={() => router.push(`/(tabs)/summaries/${item.id}`)}>
      <Card.Title
        title={new Date(item.createdAt).toLocaleDateString("ru", {
          day: "numeric",
          month: "long",
        })}
        subtitle={item.period === "DAILY" ? "Дневной" : "Недельный"}
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
      <ScrollView horizontal style={styles.periodFilters} showsHorizontalScrollIndicator={false}>
        {PERIOD_OPTIONS.map(({ label, value }) => (
          <Chip
            key={label}
            selected={period === value}
            onPress={() => setPeriod(value)}
            style={styles.filterChip}
          >
            {label}
          </Chip>
        ))}
      </ScrollView>

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
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Отмена</Button>
            <Button
              onPress={async () => {
                await generateSummary.mutateAsync("daily");
                setShowDialog(false);
              }}
              loading={generateSummary.isPending}
            >
              Дневное
            </Button>
            <Button
              onPress={async () => {
                await generateSummary.mutateAsync("weekly");
                setShowDialog(false);
              }}
              loading={generateSummary.isPending}
            >
              Недельное
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
  periodFilters: {
    flexGrow: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  topicFilters: {
    flexGrow: 0,
    paddingHorizontal: 16,
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
});
