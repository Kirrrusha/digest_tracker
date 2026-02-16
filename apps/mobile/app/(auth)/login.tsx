import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { useAuthStore } from "../../src/stores/auth";

WebBrowser.maybeCompleteAuthSession();

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export default function LoginScreen() {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Обрабатываем deep link devdigest://auth/callback?token=...
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const parsed = Linking.parse(event.url);

      if (parsed.path === "auth/callback") {
        const token = parsed.queryParams?.token as string | undefined;
        const err = parsed.queryParams?.error as string | undefined;

        if (token) {
          // Сохраняем токен — auth guard сделает redirect на (tabs)
          await setToken(token);
        } else if (err) {
          setError(getErrorMessage(err));
          setIsLoading(false);
        }
      }
    };

    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, [setAuth]);

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_BASE_URL}/mobile/auth`,
        "devdigest://auth/callback",
        { showInRecents: true }
      );

      // Если пользователь закрыл браузер без логина
      if (result.type === "cancel" || result.type === "dismiss") {
        setIsLoading(false);
      }
      // Успешный редирект обрабатывается в useEffect через Linking
    } catch {
      setError("Ошибка открытия браузера. Попробуйте снова.");
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        DevDigest
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Агрегатор контента из Telegram-каналов
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Ожидание авторизации...</Text>
        </View>
      ) : (
        <Button mode="contained" onPress={handleTelegramLogin} style={styles.button} icon="send">
          Войти через Telegram
        </Button>
      )}
    </View>
  );
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    missing_fields: "Неполные данные от Telegram",
    invalid_signature: "Ошибка проверки подписи",
    server_error: "Ошибка сервера. Попробуйте снова.",
  };
  return messages[code] ?? "Неизвестная ошибка. Попробуйте снова.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  button: {
    width: "100%",
    marginTop: 8,
  },
  error: {
    color: "#ef4444",
    textAlign: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 8,
    borderRadius: 8,
    width: "100%",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    opacity: 0.6,
  },
});
