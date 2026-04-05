import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/theme";
import { initDatabase } from "../lib/db";
import { startSyncWorker } from "../lib/sync";
import { isOnboardingComplete } from "../lib/user";
import { useAuthStore } from "../stores/useAuthStore";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);

  const statusBarStyle =
    colors.statusBar === "dark" ? "dark-content" : "light-content";

  useEffect(() => {
    console.log("Initializing database...");
    initDatabase()
      .then(async () => {
        console.log("Database initialized successfully");

        // Load auth token and start sync worker
        await useAuthStore.getState().loadToken();
        startSyncWorker();
        console.log("Sync worker started");

        // Check if onboarding is complete (default to show welcome if check fails)
        try {
          const onboardingComplete = await isOnboardingComplete();
          setShowWelcome(!onboardingComplete);
        } catch (e) {
          console.log("Onboarding check failed, showing welcome:", e);
          setShowWelcome(true);
        }

        setIsReady(true);
      })
      .catch((err) => {
        console.error("Database init failed:", err);
        setError(err.message || "Unknown error");
      });
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.hint}>Try: npx expo start -c to clear cache</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={colors.background}
      />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["left", "right"]}
      >
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.textPrimary,
            contentStyle: {
              backgroundColor: colors.background,
            },
            gestureEnabled: false,
          }}
        >
          {showWelcome ? (
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          )}
        </Stack>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.danger,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
