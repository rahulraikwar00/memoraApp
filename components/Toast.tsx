import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useThemeStore } from "../stores/useThemeStore";

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  onClose: () => void;
}

export default function Toast({ visible, type, message, onClose }: ToastProps) {
  const { colors, spacing, borderRadius } = useThemeStore();
  
  const icons: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { name: 'checkmark-circle', color: colors.success },
    error: { name: 'alert-circle', color: colors.danger },
    warning: { name: 'warning', color: colors.warning },
    info: { name: 'information-circle', color: colors.accent },
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.elevated }]}>
            <Ionicons name={icons[type].name} size={28} color={icons[type].color} />
          </View>
          <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 32,
    gap: 12,
    maxWidth: 340,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
});