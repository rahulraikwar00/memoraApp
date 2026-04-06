import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import { getContentType, getContentIcon } from "../lib/types";

interface BookmarkOptionsModalProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
  onOpenLink?: () => void;
  onTogglePublic?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

export default function BookmarkOptionsModal({
  visible,
  bookmark,
  onClose,
  onOpenLink,
  onTogglePublic,
  onEdit,
  onShare,
  onDelete,
}: BookmarkOptionsModalProps) {
  const { colors, spacing, borderRadius } = useThemeStore();
  const contentType = getContentType(bookmark);
  const isLink = contentType === "link";

  const handleCopyUrl = () => {
    Clipboard.setString(bookmark.url);
    Alert.alert("Copied", "URL copied to clipboard");
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

  const handleShare = () => {
    onShare?.();
    onClose();
  };

  const handleEdit = () => {
    onEdit?.();
    onClose();
  };

  const handleTogglePublic = () => {
    onTogglePublic?.();
    onClose();
  };

  const handleOpenLink = () => {
    onOpenLink?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.textTertiary }]} />
          
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accent + "20" }]}>
                <Ionicons
                  name={getContentIcon(contentType)}
                  size={16}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {bookmark.title || bookmark.url || "Bookmark"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.options, { gap: spacing.xs }]}>
            {isLink && onOpenLink && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleOpenLink}
              >
                <Ionicons name="open-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Open Link
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {onTogglePublic && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleTogglePublic}
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

            {onEdit && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Edit
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {onShare && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                  Share
                </Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            )}

            {!!bookmark.url && (
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
  container: {
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
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
    fontSize: 16,
    flex: 1,
  },
});
