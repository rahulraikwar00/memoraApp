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
import { initDatabase } from "../lib/db";
import { startSyncWorker } from "../lib/sync";
import { isOnboardingComplete } from "../lib/user";
import { useAuthStore } from "../stores/useAuthStore";
import { useThemeStore } from "../stores/useThemeStore";
import "../global.css";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [themeHydrated, setThemeHydrated] = useState(false);
  
  // Theme and Auth selectors
  const colors = useThemeStore(state => state.colors);
  const isDark = useThemeStore(state => state.isDark);
  
  const isReady = dbReady && authHydrated && themeHydrated;

  const statusBarStyle = isDark ? "light-content" : "dark-content";

  // Handle store hydration reactively
  useEffect(() => {
    const checkAuth = () => {
      const hydrated = useAuthStore.persist.hasHydrated();
      console.log("RootLayout: Auth Hydration Check:", hydrated);
      setAuthHydrated(hydrated);
    };
    const checkTheme = () => {
      const hydrated = useThemeStore.persist.hasHydrated();
      console.log("RootLayout: Theme Hydration Check:", hydrated);
      setThemeHydrated(hydrated);
    };

    // Check immediately
    checkAuth();
    checkTheme();

    // Listen for hydration finish
    const unsubAuth = useAuthStore.persist.onFinishHydration(checkAuth);
    const unsubTheme = useThemeStore.persist.onFinishHydration(checkTheme);

    return () => {
      unsubAuth();
      unsubTheme();
    };
  }, []);

  useEffect(() => {
    console.log("RootLayout: Starting Database Init...");
    initDatabase()
      .then(async () => {
        console.log("RootLayout: Database Init Success");

        // start sync worker (auth token is handled by persist)
        startSyncWorker();

        // Check if onboarding is complete
        try {
          const onboardingComplete = await isOnboardingComplete();
          setShowWelcome(!onboardingComplete);
          console.log("RootLayout: User Onboarding check done:", !onboardingComplete);
        } catch (e) {
          console.log("RootLayout: User Onboarding check error:", e);
          setShowWelcome(true);
        }

        setDbReady(true);
      })
      .catch((err) => {
        console.error("RootLayout: Database Init Error:", err);
        setInitError(err.message || "Unknown Error");
      });
  }, []);

  if (initError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.danger }]}>Database Error</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{initError}</Text>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>Try resetting the app or clearing cache.</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Waking up Memora...</Text>
        
        {/* Debug Info Overlay */}
        <View style={styles.debugContainer}>
          <Text style={[styles.debugText, { color: dbReady ? "#4ade80" : "#fb7185" }]}>
            {dbReady ? "✓" : "○"} Database {dbReady ? "Ready" : "Initializing..."}
          </Text>
          <Text style={[styles.debugText, { color: authHydrated ? "#4ade80" : "#fb7185" }]}>
            {authHydrated ? "✓" : "○"} Auth {authHydrated ? "Ready" : "Hydrating..."}
          </Text>
          <Text style={[styles.debugText, { color: themeHydrated ? "#4ade80" : "#fb7185" }]}>
            {themeHydrated ? "✓" : "○"} Theme {themeHydrated ? "Ready" : "Hydrating..."}
          </Text>
        </View>
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
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  hint: {
    fontSize: 12,
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "500",
  },
  debugContainer: {
    marginTop: 40,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    gap: 8,
    minWidth: 200,
  },
  debugText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  }
});
