import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon } from "../lib/types";

interface CardActionMenuProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
  position?: { x: number; y: number };
  onCopyUrl?: () => void;
  onShare?: () => void;
  onTogglePublic?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

export default function CardActionMenu({
  visible,
  bookmark,
  onClose,
  position,
  onCopyUrl,
  onShare,
  onTogglePublic,
  onToggleFavorite,
  onDelete,
}: CardActionMenuProps) {
  const { colors, spacing } = useThemeStore();
  const contentType = getContentType(bookmark);

  const handleCopyUrl = async () => {
    if (bookmark.url) {
      await Clipboard.setStringAsync(bookmark.url);
    }
    onCopyUrl?.();
    onClose();
  };

  const handleShare = () => {
    onShare?.();
    onClose();
  };

  const handleTogglePublic = () => {
    onTogglePublic?.();
    onClose();
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.();
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to delete this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.();
            onClose();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable
        style={[
          styles.menu,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            top: position?.y ?? 0,
            left: position?.x ?? 0,
          },
        ]}
        onPress={(e) => e.stopPropagation()}
      >
        {onToggleFavorite && (
          <Pressable style={styles.menuItem} onPress={handleToggleFavorite}>
            <Ionicons
              name={bookmark.is_favorite ? "bookmark" : "bookmark-outline"}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              {bookmark.is_favorite ? "Remove Favorite" : "Make Favorite"}
            </Text>
          </Pressable>
        )}

        {onTogglePublic && (
          <Pressable style={styles.menuItem} onPress={handleTogglePublic}>
            <Ionicons
              name={bookmark.is_public ? "lock-closed-outline" : "globe-outline"}
              size={18}
              color={colors.textPrimary}
            />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              {bookmark.is_public ? "Make Private" : "Make Public"}
            </Text>
          </Pressable>
        )}

        {onShare && (
          <Pressable style={styles.menuItem} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Share
            </Text>
          </Pressable>
        )}

        {!!bookmark.url && (
          <Pressable style={styles.menuItem} onPress={handleCopyUrl}>
            <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
            <Text style={[styles.menuText, { color: colors.textPrimary }]}>
              Copy URL
            </Text>
          </Pressable>
        )}

        {onDelete && (
          <Pressable style={styles.menuItem} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.menuText, { color: colors.danger }]}>
              Delete
            </Text>
          </Pressable>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: "absolute",
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "500",
  },
});