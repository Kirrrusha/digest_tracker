import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Checkbox, Searchbar, Text } from "react-native-paper";

import type { MTProtoChannelInfo } from "../src/api/endpoints";
import { useBulkAddMTProtoChannels, useMTProtoChannels } from "../src/hooks";

interface TelegramChannelBrowserProps {
  onAdded?: () => void;
}

export function TelegramChannelBrowser({ onAdded }: TelegramChannelBrowserProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: channels = [], isLoading, error } = useMTProtoChannels(true);
  const bulkAdd = useBulkAddMTProtoChannels();

  const filtered = channels.filter((ch) => ch.title.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string, alreadyTracked: boolean) => {
    if (alreadyTracked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const toAdd = channels
      .filter((ch) => selected.has(ch.id))
      .map((ch) => ({
        telegramId: ch.id,
        title: ch.title,
        username: ch.username,
        accessHash: ch.accessHash,
      }));
    if (!toAdd.length) return;
    bulkAdd.mutate(toAdd, {
      onSuccess: () => {
        setSelected(new Set());
        onAdded?.();
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text variant="bodySmall" style={styles.hint}>
          Загрузка каналов...
        </Text>
      </View>
    );
  }

  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <Banner visible icon="alert-circle" style={styles.banner}>
        {msg ?? "Не удалось загрузить каналы. Убедитесь, что Telegram подключён в настройках."}
      </Banner>
    );
  }

  if (channels.length === 0) {
    return (
      <Text variant="bodyMedium" style={styles.empty}>
        Каналы не найдены. Убедитесь, что вы состоите в Telegram каналах.
      </Text>
    );
  }

  const renderItem = ({ item }: { item: MTProtoChannelInfo }) => (
    <View style={[styles.item, item.isAlreadyTracked && styles.itemDisabled]}>
      <Checkbox
        status={selected.has(item.id) || item.isAlreadyTracked ? "checked" : "unchecked"}
        disabled={item.isAlreadyTracked}
        onPress={() => toggleSelect(item.id, item.isAlreadyTracked)}
      />
      <View style={styles.itemContent}>
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={item.isAlreadyTracked ? styles.hint : undefined}
        >
          {item.title}
        </Text>
        <Text variant="bodySmall" style={styles.hint} numberOfLines={1}>
          {[
            item.username ? `@${item.username}` : null,
            item.participantsCount !== null
              ? `${item.participantsCount.toLocaleString()} уч.`
              : null,
            item.isAlreadyTracked ? "Отслеживается" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Поиск по названию..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        ListEmptyComponent={
          <Text variant="bodySmall" style={styles.empty}>
            Ничего не найдено
          </Text>
        }
      />

      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.hint}>
          {selected.size > 0 ? `Выбрано: ${selected.size}` : `Каналов: ${channels.length}`}
        </Text>
        <Button
          mode="contained"
          onPress={handleAdd}
          disabled={selected.size === 0 || bulkAdd.isPending}
          loading={bulkAdd.isPending}
          compact
        >
          Добавить ({selected.size})
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  center: { alignItems: "center", gap: 8, paddingVertical: 24 },
  banner: { backgroundColor: "#fef2f2", borderRadius: 8 },
  search: { marginBottom: 4 },
  list: { maxHeight: 320 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  itemDisabled: { opacity: 0.5 },
  itemContent: { flex: 1, marginLeft: 4 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  hint: { opacity: 0.5 },
  empty: { textAlign: "center", paddingVertical: 16, opacity: 0.5 },
});
