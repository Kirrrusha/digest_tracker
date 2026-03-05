import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Banner, Button, Checkbox, Text } from "react-native-paper";

import type { MTProtoChannelInfo, MTProtoFolderInfo } from "../src/api/endpoints";
import { useBulkAddMTProtoChannels, useMTProtoFolders } from "../src/hooks";

interface TelegramFolderBrowserProps {
  onAdded?: () => void;
}

export function TelegramFolderBrowser({ onAdded }: TelegramFolderBrowserProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localFolders, setLocalFolders] = useState<MTProtoFolderInfo[] | null>(null);

  const { data: folders = [], isLoading, error } = useMTProtoFolders(true);
  const bulkAdd = useBulkAddMTProtoChannels();

  const displayed = localFolders ?? folders;

  const toggleFolder = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChannel = (id: string, alreadyTracked: boolean) => {
    if (alreadyTracked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInFolder = (channels: MTProtoChannelInfo[]) => {
    const addable = channels.filter((ch) => !ch.isAlreadyTracked).map((ch) => ch.id);
    const allSelected = addable.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        addable.forEach((id) => next.delete(id));
      } else {
        addable.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleAdd = () => {
    const allChannels = displayed.flatMap((f) => f.channels);
    const toAdd = allChannels
      .filter((ch) => selected.has(ch.id))
      .map((ch) => ({
        telegramId: ch.id,
        title: ch.title,
        username: ch.username,
        accessHash: ch.accessHash,
      }));
    if (!toAdd.length) return;
    bulkAdd.mutate(toAdd, {
      onSuccess: (result) => {
        const addedIds = new Set(toAdd.map((i) => i.telegramId));
        setLocalFolders(
          displayed.map((f) => ({
            ...f,
            channels: f.channels.map((ch) =>
              addedIds.has(ch.id) ? { ...ch, isAlreadyTracked: true } : ch
            ),
          }))
        );
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
          Загрузка папок...
        </Text>
      </View>
    );
  }

  if (error) {
    const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    return (
      <Banner visible icon="alert-circle" style={styles.banner}>
        {msg ?? "Не удалось загрузить папки. Убедитесь, что Telegram подключён в настройках."}
      </Banner>
    );
  }

  if (displayed.length === 0) {
    return (
      <Text variant="bodyMedium" style={styles.empty}>
        Папки не найдены. Создайте папки в Telegram для организации каналов.
      </Text>
    );
  }

  type ListItem =
    | { type: "folder"; folder: MTProtoFolderInfo }
    | { type: "channel"; channel: MTProtoChannelInfo; folderId: number };

  const items: ListItem[] = [];
  for (const folder of displayed) {
    items.push({ type: "folder", folder });
    if (expanded.has(folder.id)) {
      for (const channel of folder.channels) {
        items.push({ type: "channel", channel, folderId: folder.id });
      }
    }
  }

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === "folder") {
      const { folder } = item;
      const isOpen = expanded.has(folder.id);
      const addable = folder.channels.filter((ch) => !ch.isAlreadyTracked);
      const allSelected = addable.length > 0 && addable.every((ch) => selected.has(ch.id));

      return (
        <TouchableOpacity style={styles.folderRow} onPress={() => toggleFolder(folder.id)}>
          <MaterialCommunityIcons
            name={isOpen ? "chevron-down" : "chevron-right"}
            size={18}
            color="#9ca3af"
          />
          <Text variant="bodyMedium" style={styles.folderTitle}>
            {folder.title}
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            {folder.channels.length} кан.
          </Text>
          {addable.length > 0 && (
            <Button
              compact
              mode="text"
              onPress={() => selectAllInFolder(folder.channels)}
              labelStyle={styles.selectAllLabel}
            >
              {allSelected ? "Снять" : "Все"}
            </Button>
          )}
        </TouchableOpacity>
      );
    }

    const { channel } = item;
    return (
      <View style={[styles.channelRow, channel.isAlreadyTracked && styles.itemDisabled]}>
        <Checkbox
          status={selected.has(channel.id) || channel.isAlreadyTracked ? "checked" : "unchecked"}
          disabled={channel.isAlreadyTracked}
          onPress={() => toggleChannel(channel.id, channel.isAlreadyTracked)}
        />
        <TouchableOpacity
          style={styles.channelContent}
          onPress={() => toggleChannel(channel.id, channel.isAlreadyTracked)}
          disabled={channel.isAlreadyTracked}
        >
          <Text
            variant="bodyMedium"
            numberOfLines={1}
            style={channel.isAlreadyTracked ? styles.hint : undefined}
          >
            {channel.title}
          </Text>
          <Text variant="bodySmall" style={styles.hint} numberOfLines={1}>
            {[
              channel.username ? `@${channel.username}` : null,
              channel.participantsCount !== null
                ? `${channel.participantsCount.toLocaleString()} уч.`
                : null,
              channel.isAlreadyTracked ? "Отслеживается" : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) =>
          item.type === "folder" ? `f-${item.folder.id}` : `c-${item.channel.id}`
        }
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
          {selected.size > 0 ? `Выбрано: ${selected.size}` : `Папок: ${displayed.length}`}
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
  list: { maxHeight: 360 },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  folderTitle: { flex: 1, fontWeight: "600" },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    paddingLeft: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  channelContent: { flex: 1, marginLeft: 4 },
  itemDisabled: { opacity: 0.5 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  selectAllLabel: { fontSize: 12 },
  hint: { opacity: 0.5 },
  empty: { textAlign: "center", paddingVertical: 16, opacity: 0.5 },
});
