import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  List,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { TelegramChannelBrowser } from "../../components/TelegramChannelBrowser";
import { TelegramConnect } from "../../components/TelegramConnect";
import {
  useChangePassword,
  useMTProtoStatus,
  usePreferences,
  useProfile,
  useSetPassword,
  useUpdatePreferences,
} from "../../src/hooks";
import { useAuthStore } from "../../src/stores/auth";

const AVAILABLE_TOPICS = [
  "React",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Python",
  "DevOps",
  "Docker",
  "Kubernetes",
  "AI/ML",
  "Security",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "Database",
  "Architecture",
];

const INTERVAL_OPTIONS: { label: string; value: "daily" | "weekly" }[] = [
  { label: "Ежедневно", value: "daily" },
  { label: "Еженедельно", value: "weekly" },
];

const LANGUAGE_OPTIONS = [
  { label: "Русский", value: "ru" },
  { label: "English", value: "en" },
];

export default function SettingsScreen() {
  const { clearAuth } = useAuthStore();
  const { data: profile } = useProfile();
  const { data: prefs, isLoading: prefsLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const { data: mtprotoStatus } = useMTProtoStatus();

  const changePassword = useChangePassword();
  const setPassword = useSetPassword();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.hasPassword === false) {
      setForgotPw(true);
    }
  }, [profile]);
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLogin, setPwLogin] = useState("");
  const [forgotPw, setForgotPw] = useState(false);

  const isPwPending = changePassword.isPending || setPassword.isPending;

  const handleChangePassword = () => {
    if (pwNext.length < 6) {
      Alert.alert("Ошибка", "Новый пароль должен быть не короче 6 символов");
      return;
    }
    if (pwNext !== pwConfirm) {
      Alert.alert("Ошибка", "Пароли не совпадают");
      return;
    }
    const needsLogin = forgotPw && !profile?.hasPassword && !profile?.login;
    if (needsLogin && pwLogin.trim().length < 3) {
      Alert.alert("Ошибка", "Логин должен быть не короче 3 символов");
      return;
    }
    const onSuccess = () => {
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
      setPwLogin("");
      setForgotPw(false);
      Alert.alert("Готово", "Пароль успешно изменён");
    };
    const onError = (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      Alert.alert("Ошибка", msg ?? "Не удалось сменить пароль");
    };
    if (forgotPw) {
      setPassword.mutate(
        { newPassword: pwNext, login: needsLogin ? pwLogin.trim() : undefined },
        { onSuccess, onError }
      );
    } else {
      changePassword.mutate(
        { currentPassword: pwCurrent, newPassword: pwNext },
        { onSuccess, onError }
      );
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleTopic = (topic: string) => {
    if (!prefs) return;
    const topics = prefs.topics.includes(topic)
      ? prefs.topics.filter((t) => t !== topic)
      : [...prefs.topics, topic];
    updatePrefs.mutate({ ...prefs, topics });
  };

  const setInterval = (summaryInterval: "daily" | "weekly") => {
    if (!prefs) return;
    updatePrefs.mutate({ ...prefs, summaryInterval });
  };

  const setLanguage = (language: string) => {
    if (!prefs) return;
    updatePrefs.mutate({ ...prefs, language });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <List.Section title="Профиль">
          <List.Item
            title={profile?.name ?? "Загрузка..."}
            description={profile?.email ?? profile?.telegramUsername ?? ""}
            left={(props) => <List.Icon {...props} icon="account" />}
          />
        </List.Section>

        <Divider />

        <List.Section title="Telegram">
          <View style={styles.telegramSection}>
            <TelegramConnect hasActiveSession={mtprotoStatus?.hasActiveSession ?? false} />
            {mtprotoStatus?.hasActiveSession && (
              <Button
                mode="outlined"
                icon="telegram"
                onPress={() => setShowChannelBrowser(true)}
                style={styles.addChannelsButton}
              >
                Добавить каналы из Telegram
              </Button>
            )}
          </View>
        </List.Section>

        <Divider />

        <List.Accordion
          title="Темы"
          description={prefs ? `Выбрано: ${prefs.topics.length}` : ""}
          left={(props) => <List.Icon {...props} icon="tag-multiple" />}
          expanded={expandedSection === "topics"}
          onPress={() => toggleSection("topics")}
        >
          {prefsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.topicsGrid}>
              {AVAILABLE_TOPICS.map((topic) => (
                <Chip
                  key={topic}
                  selected={prefs?.topics.includes(topic)}
                  onPress={() => toggleTopic(topic)}
                  style={styles.topicChip}
                >
                  {topic}
                </Chip>
              ))}
            </View>
          )}
        </List.Accordion>

        <Divider />

        <List.Accordion
          title="Интервал дайджеста"
          description={
            prefs
              ? (INTERVAL_OPTIONS.find((o) => o.value === prefs.summaryInterval)?.label ?? "")
              : ""
          }
          left={(props) => <List.Icon {...props} icon="clock-outline" />}
          expanded={expandedSection === "interval"}
          onPress={() => toggleSection("interval")}
        >
          <View style={styles.optionsRow}>
            {INTERVAL_OPTIONS.map(({ label, value }) => (
              <Chip
                key={value}
                selected={prefs?.summaryInterval === value}
                onPress={() => setInterval(value)}
                style={styles.optionChip}
              >
                {label}
              </Chip>
            ))}
          </View>
        </List.Accordion>

        <Divider />

        <List.Accordion
          title="Язык"
          description={
            prefs ? (LANGUAGE_OPTIONS.find((o) => o.value === prefs.language)?.label ?? "") : ""
          }
          left={(props) => <List.Icon {...props} icon="translate" />}
          expanded={expandedSection === "language"}
          onPress={() => toggleSection("language")}
        >
          <View style={styles.optionsRow}>
            {LANGUAGE_OPTIONS.map(({ label, value }) => (
              <Chip
                key={value}
                selected={prefs?.language === value}
                onPress={() => setLanguage(value)}
                style={styles.optionChip}
              >
                {label}
              </Chip>
            ))}
          </View>
        </List.Accordion>

        <Divider />

        <List.Section title="Telegram">
          <List.Item
            title="Помечать прочитанными в Telegram"
            description="После генерации саммари"
            left={(props) => <List.Icon {...props} icon="check-all" />}
            right={() =>
              prefs ? (
                <Switch
                  value={prefs.markTelegramAsRead}
                  onValueChange={(v) => updatePrefs.mutate({ ...prefs, markTelegramAsRead: v })}
                  disabled={updatePrefs.isPending}
                />
              ) : null
            }
          />
        </List.Section>

        <Divider />

        <List.Section title="Уведомления">
          <List.Item
            title="Уведомления"
            left={(props) => <List.Icon {...props} icon="bell-outline" />}
            right={() =>
              prefs ? (
                <Switch
                  value={prefs.notificationsEnabled}
                  onValueChange={(v) => updatePrefs.mutate({ ...prefs, notificationsEnabled: v })}
                  disabled={updatePrefs.isPending}
                />
              ) : null
            }
          />
          {prefs?.notificationsEnabled && (
            <>
              <List.Item
                title="Telegram-уведомления"
                left={(props) => <List.Icon {...props} icon="send" />}
                right={() => (
                  <Switch
                    value={prefs.telegramNotifications}
                    onValueChange={(v) =>
                      updatePrefs.mutate({ ...prefs, telegramNotifications: v })
                    }
                    disabled={updatePrefs.isPending}
                  />
                )}
              />
              <List.Item
                title="Новые саммари"
                left={(props) => <List.Icon {...props} icon="text-box" />}
                right={() => (
                  <Switch
                    value={prefs.notifyOnNewSummary}
                    onValueChange={(v) => updatePrefs.mutate({ ...prefs, notifyOnNewSummary: v })}
                    disabled={updatePrefs.isPending}
                  />
                )}
              />
              <List.Item
                title="Новые посты"
                left={(props) => <List.Icon {...props} icon="newspaper" />}
                right={() => (
                  <Switch
                    value={prefs.notifyOnNewPosts}
                    onValueChange={(v) => updatePrefs.mutate({ ...prefs, notifyOnNewPosts: v })}
                    disabled={updatePrefs.isPending}
                  />
                )}
              />
            </>
          )}
        </List.Section>

        <Divider />

        <List.Section title="О приложении">
          <List.Item
            title="Версия"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
        </List.Section>

        <Divider />

        <List.Accordion
          title="Смена пароля"
          left={(props) => <List.Icon {...props} icon="lock-reset" />}
          expanded={expandedSection === "password"}
          onPress={() => toggleSection("password")}
        >
          <View style={styles.passwordSection}>
            {forgotPw ? (
              <Text variant="bodySmall" style={styles.forgotHint}>
                Вы уже авторизованы — можете установить новый пароль без старого.
              </Text>
            ) : (
              <TextInput
                label="Текущий пароль"
                value={pwCurrent}
                onChangeText={setPwCurrent}
                secureTextEntry
                mode="outlined"
                style={styles.passwordInput}
              />
            )}
            {forgotPw && !profile?.hasPassword && !profile?.login && (
              <TextInput
                label="Логин (для входа по паролю)"
                value={pwLogin}
                onChangeText={setPwLogin}
                autoCapitalize="none"
                mode="outlined"
                style={styles.passwordInput}
              />
            )}
            <TextInput
              label="Новый пароль (мин. 6 символов)"
              value={pwNext}
              onChangeText={setPwNext}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <TextInput
              label="Повторите новый пароль"
              value={pwConfirm}
              onChangeText={setPwConfirm}
              secureTextEntry
              mode="outlined"
              style={styles.passwordInput}
            />
            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={isPwPending}
              disabled={
                isPwPending ||
                (!forgotPw && !pwCurrent) ||
                !pwNext ||
                !pwConfirm ||
                (forgotPw && !profile?.hasPassword && !profile?.login && !pwLogin)
              }
              style={styles.passwordButton}
            >
              {forgotPw ? "Установить пароль" : "Сменить пароль"}
            </Button>
            <Button
              mode="text"
              compact
              onPress={() => {
                setForgotPw((v) => !v);
                setPwCurrent("");
                setPwNext("");
                setPwConfirm("");
              }}
            >
              {forgotPw ? "Помню пароль" : "Не помню пароль"}
            </Button>
          </View>
        </List.Accordion>

        <Divider />

        <View style={styles.logout}>
          {updatePrefs.isPending && <Text style={styles.saving}>Сохранение...</Text>}
          <Button mode="outlined" textColor="#ef4444" icon="logout" onPress={clearAuth}>
            Выйти
          </Button>
        </View>
      </ScrollView>

      <Modal
        visible={showChannelBrowser}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChannelBrowser(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text variant="titleMedium">Мои Telegram каналы</Text>
            <Button onPress={() => setShowChannelBrowser(false)} compact>
              Закрыть
            </Button>
          </View>
          <View style={styles.modalContent}>
            <TelegramChannelBrowser onAdded={() => setShowChannelBrowser(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { padding: 16, alignItems: "center" },
  topicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 16,
  },
  topicChip: {},
  optionsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    flexWrap: "wrap",
  },
  optionChip: {},
  logout: { padding: 16, gap: 8 },
  saving: { textAlign: "center", opacity: 0.5 },
  telegramSection: { paddingHorizontal: 16, paddingBottom: 12 },
  addChannelsButton: { marginTop: 8 },
  passwordSection: { padding: 16, gap: 8 },
  passwordInput: { marginBottom: 4 },
  passwordButton: { marginTop: 4 },
  forgotHint: { opacity: 0.6 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  modalContent: { padding: 16, flex: 1 },
});
