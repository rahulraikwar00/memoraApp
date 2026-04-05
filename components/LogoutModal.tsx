import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { clearAllData } from "../lib/db";

const STORAGE_KEYS = {
  username: "user_username",
  avatarUrl: "user_avatar_url",
  onboardingComplete: "onboarding_complete",
};

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LogoutModal({ visible, onClose }: LogoutModalProps) {
  const { colors, spacing, borderRadius } = useThemeStore();
  const [deleteScale] = useState(new Animated.Value(1));
  const [keepScale] = useState(new Animated.Value(1));

  const animatePress = (scale: Animated.Value, toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handleKeepBookmarks = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.username);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.avatarUrl);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.onboardingComplete);
      router.replace("/welcome");
    } catch (e) {
      console.error("Logout error:", e);
    }
    onClose();
  };

  const handleDeleteAll = async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.username);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.avatarUrl);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.onboardingComplete);
      await clearAllData();
      router.replace("/welcome");
    } catch (e) {
      console.error("Logout error:", e);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modal,
            { backgroundColor: colors.card, borderRadius: borderRadius.lg },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Logout
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            What would you like to do{"\n"}with your saved bookmarks?
          </Text>

          <Animated.View
            style={{ transform: [{ scale: deleteScale }], width: "100%" }}
          >
            <Pressable
              style={[styles.button, { backgroundColor: colors.danger }]}
              onPressIn={() => animatePress(deleteScale, 0.95)}
              onPressOut={() => animatePress(deleteScale, 1)}
              onPress={handleDeleteAll}
            >
              {/* Icon is absolute, so it doesn't "push" the text */}
              <View style={styles.iconContainer}>
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              </View>

              <Text style={styles.buttonText}>Delete All</Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={{ transform: [{ scale: keepScale }], width: "100%" }}
          >
            <Pressable
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPressIn={() => animatePress(keepScale, 0.95)}
              onPressOut={() => animatePress(keepScale, 1)}
              onPress={handleKeepBookmarks}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="bookmark-outline" size={20} color="#FFFFFF" />
              </View>

              <Text style={styles.buttonText}>Keep Bookmarks</Text>
            </Pressable>
          </Animated.View>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Ionicons
              name="close-outline"
              size={20}
              color={colors.textTertiary}
            />
            <Text style={[styles.cancelText, { color: colors.textTertiary }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  iconContainer: {
    position: "absolute",
    left: 20, // Adjust this to move icon closer/further from edge
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Centers the text perfectly
    width: "100%",
    paddingVertical: 16, // Increased slightly for better tap target
    borderRadius: 12,
    marginBottom: 12,
    position: "relative", // Necessary for absolute icon positioning
    overflow: "hidden",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    // No margins needed here now!
  },
  buttonIcon: {
    // Fixed width for the icon ensures the spacer matches perfectly
    width: 20,
    textAlign: "center",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
