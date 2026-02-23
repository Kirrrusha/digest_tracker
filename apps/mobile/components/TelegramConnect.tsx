import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Text, TextInput } from "react-native-paper";

import { useDisconnectMTProto, useSendMTProtoCode, useVerifyMTProtoCode } from "../src/hooks";

type Step = "phone" | "code" | "password" | "connected";

interface TelegramConnectProps {
  hasActiveSession: boolean;
}

export function TelegramConnect({ hasActiveSession }: TelegramConnectProps) {
  const [step, setStep] = useState<Step>(hasActiveSession ? "connected" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendCode = useSendMTProtoCode();
  const verify = useVerifyMTProtoCode();
  const disconnect = useDisconnectMTProto();

  const isPending = sendCode.isPending || verify.isPending || disconnect.isPending;

  const handleSendCode = () => {
    if (!phone.trim()) return;
    setError(null);
    sendCode.mutate(phone.trim(), {
      onSuccess: (data) => {
        setSessionString(data.sessionString);
        setPhoneCodeHash(data.phoneCodeHash);
        setStep("code");
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message;
        setError(msg ?? "Не удалось отправить код");
      },
    });
  };

  const handleVerify = (pwd?: string) => {
    setError(null);
    verify.mutate(
      {
        phoneNumber: phone,
        phoneCode: code.trim(),
        phoneCodeHash,
        sessionString,
        password: pwd,
      },
      {
        onSuccess: (data) => {
          if (data.needs2FA) {
            setStep("password");
            return;
          }
          setStep("connected");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          setError(msg ?? "Неверный код");
        },
      }
    );
  };

  const handleDisconnect = () => {
    setError(null);
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setPhone("");
        setCode("");
        setPassword("");
        setStep("phone");
      },
      onError: () => setError("Не удалось отключить Telegram"),
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium">Подключение Telegram</Text>
        {step === "connected" && (
          <View style={styles.badge}>
            <Text variant="labelSmall" style={styles.badgeText}>
              Подключён
            </Text>
          </View>
        )}
      </View>
      <Text variant="bodySmall" style={styles.subtitle}>
        Подключите личный аккаунт для отслеживания приватных каналов
      </Text>

      {error && (
        <Banner visible icon="alert-circle" style={styles.banner}>
          {error}
        </Banner>
      )}

      {step === "connected" && (
        <View style={styles.section}>
          <Text variant="bodyMedium" style={styles.connectedText}>
            Telegram подключён. Добавляйте приватные каналы через «Мои Telegram каналы».
          </Text>
          <Button
            mode="outlined"
            textColor="#ef4444"
            icon="logout"
            onPress={handleDisconnect}
            disabled={isPending}
            loading={isPending}
            style={styles.button}
          >
            Отключить Telegram
          </Button>
        </View>
      )}

      {step === "phone" && (
        <View style={styles.section}>
          <TextInput
            label="Номер телефона"
            placeholder="+7XXXXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            autoCapitalize="none"
            disabled={isPending}
          />
          <Text variant="bodySmall" style={styles.hint}>
            Введите номер в международном формате
          </Text>
          <Button
            mode="contained"
            onPress={handleSendCode}
            disabled={!phone.trim() || isPending}
            loading={isPending}
            style={styles.button}
          >
            Получить код
          </Button>
        </View>
      )}

      {step === "code" && (
        <View style={styles.section}>
          <Text variant="bodySmall" style={styles.hint}>
            Код отправлен на номер {phone}
          </Text>
          <TextInput
            label="Код из Telegram"
            placeholder="12345"
            value={code}
            onChangeText={setCode}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={8}
            disabled={isPending}
          />
          <View style={styles.row}>
            <Button
              mode="contained"
              onPress={() => handleVerify()}
              disabled={!code.trim() || isPending}
              loading={isPending}
              style={styles.flex}
            >
              Подтвердить
            </Button>
            <Button mode="text" onPress={() => setStep("phone")} disabled={isPending}>
              Назад
            </Button>
          </View>
        </View>
      )}

      {step === "password" && (
        <View style={styles.section}>
          <View style={styles.info}>
            <Text variant="bodySmall" style={styles.hint}>
              На аккаунте включена двухфакторная аутентификация
            </Text>
          </View>
          <TextInput
            label="Пароль 2FA"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            disabled={isPending}
          />
          <View style={styles.row}>
            <Button
              mode="contained"
              onPress={() => handleVerify(password)}
              disabled={!password.trim() || isPending}
              loading={isPending}
              style={styles.flex}
            >
              Войти
            </Button>
            <Button mode="text" onPress={() => setStep("code")} disabled={isPending}>
              Назад
            </Button>
          </View>
        </View>
      )}

      {isPending && step !== "connected" && <ActivityIndicator style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  subtitle: { opacity: 0.6 },
  badge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { color: "#16a34a" },
  banner: { backgroundColor: "#fef2f2", borderRadius: 8, marginTop: 4 },
  section: { gap: 8, marginTop: 8 },
  connectedText: { opacity: 0.7 },
  hint: { opacity: 0.5 },
  info: {
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  button: { marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1 },
  loader: { marginTop: 8 },
});
