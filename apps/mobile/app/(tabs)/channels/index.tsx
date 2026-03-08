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
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { TelegramChannelBrowser } from "../../../components/TelegramChannelBrowser";
import { TelegramFolderBrowser } from "../../../components/TelegramFolderBrowser";
import { TelegramGroupBrowser } from "../../../components/TelegramGroupBrowser";
import {
  useAddChannel,
  useChannels,
  useDeleteChannel,
  useToggleChannel,
  useUnreadCounts,
} from "../../../src/hooks";
import type { Channel } from "../../../src/types";

type AddTab = "url" | "telegram" | "groups" | "folders";
type TypeFilter = "all" | "TELEGRAM" | "RSS";

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
  { label: "Все", value: "all" },
  { label: "Telegram", value: "TELEGRAM" },
  { label: "RSS", value: "RSS" },
];

export default function ChannelsScreen() {
  const router = useRouter();
  const { data: channels, isLoading, refetch } = useChannels();
  const addChannel = useAddChannel();
  const deleteChannel = useDeleteChannel();
  const toggleChannel = useToggleChannel();
  const { data: unreadCounts } = useUnreadCounts();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<AddTab>("url");
  const [newUrl, setNewUrl] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    await addChannel.mutateAsync(newUrl.trim());
    setNewUrl("");
    setShowAddDialog(false);
  };

  const handleClose = () => {
    setShowAddDialog(false);
    setNewUrl("");
    setActiveTab("url");
  };

  const filtered = (channels ?? []).filter((ch) => {
    const matchType = typeFilter === "all" || ch.type === typeFilter;
    const matchSearch =
      !search ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.url.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const renderChannel = ({ item }: { item: Channel }) => {
    const unread = item.telegramId ? (unreadCounts?.[item.telegramId] ?? 0) : 0;
    return (
      <Card style={styles.card} onPress={() => router.push(`/(tabs)/channels/${item.id}`)}>
        <Card.Title
          title={item.name}
          subtitle={item.url}
          right={() => (
            <View style={styles.rightChips}>
              {unread > 0 && (
                <Chip compact style={styles.unreadChip} textStyle={styles.unreadChipText}>
                  {unread}
                </Chip>
              )}
              <Chip compact style={styles.chip}>
                {item.type}
              </Chip>
            </View>
          )}
        />
        <Card.Actions>
          <Button
            onPress={() => toggleChannel.mutate({ id: item.id, isActive: !item.isActive })}
            compact
          >
            {item.isActive ? "Приостановить" : "Активировать"}
          </Button>
          <Button onPress={() => deleteChannel.mutate(item.id)} textColor="#ef4444" compact>
            Удалить
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          placeholder="Поиск каналов..."
          value={search}
          onChangeText={setSearch}
          mode="outlined"
          dense
          left={<TextInput.Icon icon="magnify" />}
          right={search ? <TextInput.Icon icon="close" onPress={() => setSearch("")} /> : null}
          style={styles.searchInput}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeChips}>
          {TYPE_FILTERS.map(({ label, value }) => (
            <Chip
              key={value}
              selected={typeFilter === value}
              onPress={() => setTypeFilter(value)}
              style={styles.filterChip}
              compact
            >
              {label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {channels?.length === 0 ? "Каналы не добавлены" : "Нет каналов по фильтру"}
          </Text>
        }
      />

      <Portal>
        <Dialog visible={showAddDialog} onDismiss={handleClose} style={styles.dialog}>
          <Dialog.Title>Добавить канал</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as AddTab)}
              style={styles.tabs}
              buttons={[
                { value: "url", label: "URL" },
                { value: "telegram", label: "Каналы" },
                { value: "groups", label: "Группы" },
                { value: "folders", label: "Папки" },
              ]}
            />

            {activeTab === "url" ? (
              <TextInput
                label="URL канала или @username"
                value={newUrl}
                onChangeText={setNewUrl}
                mode="outlined"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            ) : activeTab === "telegram" ? (
              <TelegramChannelBrowser onAdded={handleClose} />
            ) : activeTab === "groups" ? (
              <TelegramGroupBrowser onAdded={handleClose} />
            ) : (
              <TelegramFolderBrowser onAdded={handleClose} />
            )}
          </Dialog.Content>

          {activeTab === "url" && (
            <Dialog.Actions>
              <Button onPress={handleClose}>Отмена</Button>
              <Button
                onPress={handleAdd}
                loading={addChannel.isPending}
                disabled={!newUrl.trim() || addChannel.isPending}
              >
                Добавить
              </Button>
            </Dialog.Actions>
          )}
          {(activeTab === "telegram" || activeTab === "groups" || activeTab === "folders") && (
            <Dialog.Actions>
              <Button onPress={handleClose}>Закрыть</Button>
            </Dialog.Actions>
          )}
        </Dialog>
      </Portal>

      <FAB icon="plus" style={styles.fab} onPress={() => setShowAddDialog(true)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filters: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  searchInput: { backgroundColor: "transparent" },
  typeChips: { flexGrow: 0 },
  filterChip: { marginRight: 8 },
  list: { padding: 16, paddingBottom: 80, gap: 12 },
  card: {},
  rightChips: { flexDirection: "row", alignItems: "center", gap: 4, marginRight: 8 },
  chip: {},
  unreadChip: { backgroundColor: "#3b82f6" },
  unreadChipText: { color: "#fff", fontWeight: "bold" },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  dialog: { maxHeight: "85%" },
  tabs: { marginBottom: 16 },
  input: { marginTop: 4 },
});
