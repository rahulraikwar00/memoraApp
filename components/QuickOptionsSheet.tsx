import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon } from "../lib/types";

interface QuickOptionsSheetProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
  onOpenLink?: () => void;
  onOpenNote?: () => void;
  onOpenImage?: () => void;
  onTogglePublic?: () => void;
  onShare?: () => void;
  onCopyUrl?: () => void;
  onDelete?: () => void;
}

export default function QuickOptionsSheet({
  visible,
  bookmark,
  onClose,
  onOpenLink,
  onOpenNote,
  onOpenImage,
  onTogglePublic,
  onShare,
  onCopyUrl,
  onDelete,
}: QuickOptionsSheetProps) {
  const { colors, spacing } = useThemeStore();
  const contentType = getContentType(bookmark);

  const handleCopyUrl = () => {
    onCopyUrl?.();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: colors.accent + "20" }]}>
              <Ionicons
                name={getContentIcon(contentType)}
                size={16}
                color={colors.accent}
              />
            </View>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {bookmark.title || bookmark.url || "Bookmark"}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.options, { gap: spacing.xs }]}>
            {contentType === "link" && onOpenLink && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={() => {
                  onOpenLink?.();
                  onClose();
                }}
              >
                <Ionicons name="open-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Open Link
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {contentType === "note" && onOpenNote && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={() => {
                  onOpenNote?.();
                  onClose();
                }}
              >
                <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Open Note
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {contentType === "image" && onOpenImage && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={() => {
                  onOpenImage?.();
                  onClose();
                }}
              >
                <Ionicons name="image-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  View Image
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {onTogglePublic && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={() => {
                  onTogglePublic?.();
                  onClose();
                }}
              >
                <Ionicons
                  name={bookmark.is_public ? "lock-closed-outline" : "globe-outline"}
                  size={22}
                  color={colors.textPrimary}
                />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  {bookmark.is_public ? "Make Private" : "Make Public"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {onShare && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={() => {
                  onShare?.();
                  onClose();
                }}
              >
                <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Share
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {!!bookmark.url && onCopyUrl && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleCopyUrl}
              >
                <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Copy URL
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {onDelete && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                <Text style={[styles.optionText, { color: colors.danger }]}>
                  Delete
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  closeButton: {
    padding: 4,
  },
  options: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
});