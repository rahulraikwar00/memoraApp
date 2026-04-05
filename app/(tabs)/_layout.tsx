import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View, Image, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { colors } from "../../constants/theme";
import { getUserAvatar } from "../../lib/user";

export default function TabLayout() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getUserAvatar().then(setAvatarUrl);
  }, []);

  const HeaderRight = () => (
    <Pressable
      onPress={() => router.push("/settings")}
      style={({ pressed }) => [styles.headerAvatar, pressed && styles.headerAvatarPressed]}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImage} resizeMode="cover" />
      ) : (
        <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
          <Ionicons name="person" size={20} color={colors.textSecondary} />
        </View>
      )}
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
        },
        headerRight: HeaderRight,
        headerRightContainerStyle: { paddingRight: 8 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="save"
        options={{
          title: "Save",
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
          title: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
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
    marginTop: -10,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonActive: {
    backgroundColor: colors.accentLight,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  headerAvatarPressed: {
    opacity: 0.7,
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarPlaceholder: {
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
