import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import TagChip from "./TagChip";

interface NoteReaderModalProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onTogglePublic?: () => void;
  onDelete?: () => void;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function NoteReaderModal({
  visible,
  bookmark,
  onClose,
  onEdit,
  onShare,
  onTogglePublic,
  onDelete,
}: NoteReaderModalProps) {
  const { colors, spacing } = useThemeStore();
  const tags = JSON.parse(bookmark.tags || "[]") as string[];
  const noteText = bookmark.description || bookmark.title || "";

  const handleCopy = () => {
    Clipboard.setString(noteText);
    Alert.alert("Copied", "Note copied to clipboard");
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
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

  const handleTogglePublic = () => {
    onTogglePublic?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            Note
          </Text>
          
          <View style={styles.headerActions}>
            {onShare && (
              <Pressable onPress={onShare} style={styles.headerButton}>
                <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
              </Pressable>
            )}
            <Pressable onPress={handleCopy} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { padding: spacing.lg }]}
        >
          {bookmark.title && (
            <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>
              {bookmark.title}
            </Text>
          )}
          
          <Text style={[styles.noteText, { color: colors.textPrimary }]}>
            {noteText}
          </Text>

          {tags.length > 0 && (
            <View style={[styles.tagsContainer, { gap: spacing.xs }]}>
              {tags.map((tag, index) => (
                <TagChip key={index} tag={tag} />
              ))}
            </View>
          )}

          <View style={[styles.metadata, { borderTopColor: colors.border }]}>
            <View style={styles.metadataItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {getRelativeTime(bookmark.created_at)}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons 
                name={bookmark.is_public ? "globe-outline" : "lock-closed-outline"} 
                size={16} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {bookmark.is_public ? "Public" : "Private"}
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.toolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable style={styles.toolbarButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>Edit</Text>
          </Pressable>
          
          <Pressable style={styles.toolbarButton} onPress={onShare}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>Share</Text>
          </Pressable>
          
          <Pressable style={styles.toolbarButton} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>Copy</Text>
          </Pressable>
          
          <Pressable style={styles.toolbarButton} onPress={handleTogglePublic}>
            <Ionicons 
              name={bookmark.is_public ? "lock-closed-outline" : "globe-outline"} 
              size={22} 
              color={colors.textPrimary} 
            />
            <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>
              {bookmark.is_public ? "Private" : "Public"}
            </Text>
          </Pressable>
          
          <Pressable style={styles.toolbarButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
            <Text style={[styles.toolbarText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  noteText: {
    fontSize: 16,
    lineHeight: 26,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
  },
  metadata: {
    flexDirection: "row",
    gap: 20,
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metadataText: {
    fontSize: 13,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  toolbarButton: {
    alignItems: "center",
    gap: 4,
    padding: 8,
  },
  toolbarText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
