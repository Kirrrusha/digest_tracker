import { useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
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

export default function SummariesScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<string | undefined>();
  const { data, isLoading, refetch } = useSummaries(period);
  const generateSummary = useGenerateSummary();
  const [showDialog, setShowDialog] = useState(false);

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
          {item.topics.slice(0, 3).map((topic) => (
            <Chip key={topic} compact style={styles.chip}>
              {topic}
            </Chip>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filters}>
        <Chip selected={!period} onPress={() => setPeriod(undefined)} style={styles.filterChip}>
          Все
        </Chip>
        <Chip
          selected={period === "DAILY"}
          onPress={() => setPeriod("DAILY")}
          style={styles.filterChip}
        >
          Дневные
        </Chip>
        <Chip
          selected={period === "WEEKLY"}
          onPress={() => setPeriod("WEEKLY")}
          style={styles.filterChip}
        >
          Недельные
        </Chip>
      </View>

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
  filters: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  filterChip: {},
  list: { padding: 16, gap: 12, paddingBottom: 80 },
  card: {},
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  chip: {},
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
