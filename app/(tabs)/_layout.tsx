import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { useEffect } from "react";
import { AppState, Platform, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../constants/theme";
import { useAudioStore } from "../../stores/useAudioStore";

export default function TabLayout() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        useAudioStore.getState().stop();
      }
    });
    return () => subscription.remove();
  }, []);

  const HeaderRight = () => (
    <Pressable
      onPress={() => router.push("/settings")}
      style={({ pressed }) => [
        styles.settingsButton,
        pressed && styles.settingsButtonPressed,
      ]}
    >
      <Ionicons name="settings" size={22} color={colors.textPrimary} />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 8,
          paddingTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: "600",
          display: "none",
        },
        headerRight: HeaderRight,
        headerRightContainerStyle: { paddingRight: 8 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="save"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={[styles.saveButton, focused && styles.saveButtonActive]}
            >
              <Ionicons
                name="add"
                size={28}
                color={focused ? colors.background : colors.textPrimary}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  saveButton: {
    backgroundColor: colors.accent,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonActive: {
    backgroundColor: colors.accentLight,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonPressed: {
    opacity: 0.7,
  },
});
