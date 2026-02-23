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
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { TelegramChannelBrowser } from "../../../components/TelegramChannelBrowser";
import {
  useAddChannel,
  useChannels,
  useDeleteChannel,
  useSyncChannel,
  useToggleChannel,
} from "../../../src/hooks";
import type { Channel } from "../../../src/types";

type AddTab = "url" | "telegram";

export default function ChannelsScreen() {
  const router = useRouter();
  const { data: channels, isLoading, refetch } = useChannels();
  const addChannel = useAddChannel();
  const deleteChannel = useDeleteChannel();
  const toggleChannel = useToggleChannel();
  const syncChannel = useSyncChannel();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<AddTab>("url");
  const [newUrl, setNewUrl] = useState("");

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

  const renderChannel = ({ item }: { item: Channel }) => (
    <Card style={styles.card} onPress={() => router.push(`/(tabs)/channels/${item.id}`)}>
      <Card.Title
        title={item.name}
        subtitle={item.url}
        right={() => (
          <Chip compact style={styles.chip}>
            {item.type}
          </Chip>
        )}
      />
      <Card.Actions>
        <Button
          onPress={() => toggleChannel.mutate({ id: item.id, isActive: !item.isActive })}
          compact
        >
          {item.isActive ? "Приостановить" : "Активировать"}
        </Button>
        <Button
          onPress={() => syncChannel.mutate(item.id)}
          loading={syncChannel.isPending && syncChannel.variables === item.id}
          disabled={syncChannel.isPending && syncChannel.variables === item.id}
          icon="sync"
          compact
        >
          Синхр.
        </Button>
        <Button onPress={() => deleteChannel.mutate(item.id)} textColor="#ef4444" compact>
          Удалить
        </Button>
      </Card.Actions>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={<Text style={styles.empty}>Каналы не добавлены</Text>}
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
                { value: "url", label: "По URL" },
                { value: "telegram", label: "Telegram" },
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
            ) : (
              <TelegramChannelBrowser onAdded={handleClose} />
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
          {activeTab === "telegram" && (
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
  list: { padding: 16, paddingBottom: 80, gap: 12 },
  card: {},
  chip: { marginRight: 8 },
  empty: { textAlign: "center", marginTop: 40, opacity: 0.5 },
  fab: { position: "absolute", right: 16, bottom: 16 },
  dialog: { maxHeight: "85%" },
  tabs: { marginBottom: 16 },
  input: { marginTop: 4 },
});
