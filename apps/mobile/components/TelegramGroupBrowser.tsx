import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Checkbox, Searchbar, Text } from "react-native-paper";

import type { MTProtoGroupInfo } from "../src/api/endpoints";
import { useBulkAddMTProtoGroups, useMTProtoGroups } from "../src/hooks";

const GROUP_TYPE_LABELS: Record<string, string> = {
  group: "Группа",
  supergroup: "Супергруппа",
  forum: "Форум",
};

interface TelegramGroupBrowserProps {
  onAdded?: () => void;
}

export function TelegramGroupBrowser({ onAdded }: TelegramGroupBrowserProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: groups = [], isLoading, error } = useMTProtoGroups(true);
  const bulkAdd = useBulkAddMTProtoGroups();

  const filtered = groups.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));

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
    const toAdd = groups
      .filter((g) => selected.has(g.id))
      .map((g) => ({
        telegramId: g.id,
        title: g.title,
        username: g.username,
        accessHash: g.accessHash,
        groupType: g.groupType,
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
          Загрузка групп...
        </Text>
      </View>
    );
  }

  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <Banner visible icon="alert-circle" style={styles.banner}>
        {msg ?? "Не удалось загрузить группы. Убедитесь, что Telegram подключён в настройках."}
      </Banner>
    );
  }

  if (groups.length === 0) {
    return (
      <Text variant="bodyMedium" style={styles.empty}>
        Группы не найдены. Убедитесь, что вы состоите в Telegram группах.
      </Text>
    );
  }

  const renderItem = ({ item }: { item: MTProtoGroupInfo }) => (
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
            GROUP_TYPE_LABELS[item.groupType] ?? item.groupType,
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
          {selected.size > 0 ? `Выбрано: ${selected.size}` : `Групп: ${groups.length}`}
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
