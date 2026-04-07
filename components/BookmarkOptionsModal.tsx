import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Bookmark } from "../lib/db";
import { getContentType } from "../lib/types";
import { useThemeStore } from "../stores/useThemeStore";

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
    console.log("Delete bookmark", bookmark.id);
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
      ],
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
          <View
            style={[styles.handle, { backgroundColor: colors.textTertiary }]}
          />

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
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
                <Ionicons
                  name="open-outline"
                  size={22}
                  color={colors.textPrimary}
                />
                <Text
                  style={[styles.optionText, { color: colors.textPrimary }]}
                >
                  Open Link
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}

            {onTogglePublic && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleTogglePublic}
              >
                <Ionicons
                  name={
                    bookmark.is_public ? "lock-closed-outline" : "globe-outline"
                  }
                  size={22}
                  color={colors.textPrimary}
                />
                <Text
                  style={[styles.optionText, { color: colors.textPrimary }]}
                >
                  {bookmark.is_public ? "Make Private" : "Make Public"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}

            {onEdit && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleEdit}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={colors.textPrimary}
                />
                <Text
                  style={[styles.optionText, { color: colors.textPrimary }]}
                >
                  Edit
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}

            {onShare && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleShare}
              >
                <Ionicons
                  name="share-outline"
                  size={22}
                  color={colors.textPrimary}
                />
                <Text
                  style={[styles.optionText, { color: colors.textPrimary }]}
                >
                  Share
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}

            {!!bookmark.url && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleCopyUrl}
              >
                <Ionicons
                  name="copy-outline"
                  size={22}
                  color={colors.textPrimary}
                />
                <Text
                  style={[styles.optionText, { color: colors.textPrimary }]}
                >
                  Copy URL
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}

            {onDelete && (
              <Pressable
                style={[styles.option, { backgroundColor: colors.elevated }]}
                onPress={handleDelete}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color={colors.danger}
                />
                <Text style={[styles.optionText, { color: colors.danger }]}>
                  Delete
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
    opacity: 0.2,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  options: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    gap: 14,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
});
