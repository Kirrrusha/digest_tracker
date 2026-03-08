import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Divider, Icon, Text } from "react-native-paper";
import { Passkey, type PasskeyGetRequest } from "react-native-passkey";

import { authApi, passkeyApi } from "../../src/api/endpoints";
import { useAuthStore } from "../../src/stores/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError("Заполните логин и пароль");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const tokens = await authApi.login(login.trim(), password);
      console.log("tokens", tokens);

      await setToken(tokens.accessToken);
    } catch {
      setError("Неверный логин или пароль");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setError(null);
    try {
      const { options, challengeId } = await passkeyApi.getLoginOptions();
      console.log("[Passkey] Options received");
      const response = await Passkey.get(options as unknown as PasskeyGetRequest);
      console.log("[Passkey] Native auth done");
      const tokens = await passkeyApi.verifyLogin(
        challengeId,
        response as unknown as Record<string, unknown>
      );
      console.log("[Passkey] Verify done");
      await setToken(tokens.accessToken);
    } catch (err: unknown) {
      if (err instanceof Error && err.message?.includes("cancel")) return;
      // Нормальные логи — сериализуем объект, иначе Metro выводит [object Object]
      const safeStringify = (obj: unknown): string => {
        try {
          return JSON.stringify(obj, null, 2);
        } catch {
          return String(obj);
        }
      };
      if (__DEV__) {
        const errObj = err as Record<string, unknown> | null;
        const res = errObj?.response as Record<string, unknown> | undefined;
        const config = errObj?.config as { baseURL?: string; url?: string } | undefined;
        const url = config ? `${config.baseURL || ""}${config.url || ""}` : "";
        if (res) {
          console.error("[Passkey] HTTP", res.status, res.statusText || "", "→", url);
          console.error("[Passkey] Response body:", safeStringify(res.data));
        } else if (err instanceof Error) {
          console.error("[Passkey] Error:", err.message);
          console.error("[Passkey] URL:", url || "(no config)");
          console.error("[Passkey] Stack:", err.stack);
        } else {
          console.error("[Passkey] Unknown:", safeStringify(err));
        }
      }
      const errorMessage =
        __DEV__ && err instanceof Error
          ? `Passkey: ${err.message}`
          : "Не удалось войти через passkey";
      setError(errorMessage);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const passkeySupported = Passkey.isSupported();

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        DevDigest
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Агрегатор контента из Telegram-каналов
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {passkeySupported && (
        <>
          <Button
            mode="outlined"
            onPress={handlePasskeyLogin}
            style={styles.button}
            icon="fingerprint"
            disabled={isPasskeyLoading || isSubmitting}
            loading={isPasskeyLoading}
          >
            Войти с помощью passkey
          </Button>

          <View style={styles.dividerRow}>
            <Divider style={styles.divider} />
            <Text variant="bodySmall" style={styles.dividerText}>
              или
            </Text>
            <Divider style={styles.divider} />
          </View>
        </>
      )}

      <TextInput
        style={styles.input}
        placeholder="Логин"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSubmitting && !isPasskeyLoading}
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!isSubmitting && !isPasskeyLoading}
          onSubmitEditing={handleLogin}
          returnKeyType="go"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((v) => !v)}
          disabled={!isSubmitting && !isPasskeyLoading ? false : true}
        >
          <Icon source={showPassword ? "eye-off" : "eye"} size={20} />
        </TouchableOpacity>
      </View>

      {isSubmitting ? (
        <ActivityIndicator style={styles.button} />
      ) : (
        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          disabled={isPasskeyLoading}
        >
          Войти
        </Button>
      )}

      <Pressable onPress={() => router.push("/(auth)/register")} disabled={isSubmitting}>
        <Text variant="bodyMedium" style={styles.link}>
          Нет аккаунта? <Text style={styles.linkAccent}>Зарегистрироваться</Text>
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  passwordContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    width: "100%",
  },
  error: {
    color: "#ef4444",
    textAlign: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 8,
    borderRadius: 8,
    width: "100%",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    opacity: 0.5,
  },
  link: {
    textAlign: "center",
    opacity: 0.7,
    marginTop: 4,
  },
  linkAccent: {
    color: "#2563eb",
    opacity: 1,
  },
});
