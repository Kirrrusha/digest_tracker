import { StyleSheet, View } from "react-native";
import { Button, Divider, List, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { useProfile } from "../../src/hooks";
import { useAuthStore } from "../../src/stores/auth";

export default function SettingsScreen() {
  const { clearAuth } = useAuthStore();
  const { data: profile } = useProfile();

  return (
    <SafeAreaView style={styles.container}>
      <List.Section title="Профиль">
        <List.Item
          title={profile?.name ?? "Загрузка..."}
          description={profile?.email ?? profile?.telegramUsername ?? ""}
          left={(props) => <List.Icon {...props} icon="account" />}
        />
      </List.Section>

      <Divider />

      <List.Section title="О приложении">
        <List.Item
          title="Версия"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </List.Section>

      <View style={styles.logout}>
        <Button mode="outlined" textColor="#ef4444" icon="logout" onPress={clearAuth}>
          Выйти
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  logout: { padding: 16, marginTop: "auto" },
});
