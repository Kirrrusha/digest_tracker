import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { authApi } from "../../src/api/endpoints";
import { useAuthStore } from "../../src/stores/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!login.trim() || !password.trim()) {
      setError("Заполните логин и пароль");
      return;
    }
    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const tokens = await authApi.register(login.trim(), password, name.trim() || undefined);
      await setToken(tokens.accessToken);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Не удалось зарегистрироваться. Попробуйте снова.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineLarge" style={styles.title}>
        Регистрация
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Имя (необязательно)"
        value={name}
        onChangeText={setName}
        autoCorrect={false}
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Логин"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isSubmitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isSubmitting}
        onSubmitEditing={handleRegister}
        returnKeyType="go"
      />

      {isSubmitting ? (
        <ActivityIndicator style={styles.button} />
      ) : (
        <Button mode="contained" onPress={handleRegister} style={styles.button}>
          Зарегистрироваться
        </Button>
      )}

      <Pressable onPress={() => router.back()} disabled={isSubmitting}>
        <Text variant="bodyMedium" style={styles.link}>
          Уже есть аккаунт? <Text style={styles.linkAccent}>Войти</Text>
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
