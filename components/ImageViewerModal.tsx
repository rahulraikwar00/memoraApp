import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  Clipboard,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../stores/useThemeStore";
import { Bookmark } from "../lib/db";
import TagChip from "./TagChip";

interface ImageViewerModalProps {
  visible: boolean;
  bookmark: Bookmark;
  onClose: () => void;
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ImageViewerModal({
  visible,
  bookmark,
  onClose,
  onTogglePublic,
  onDelete,
}: ImageViewerModalProps) {
  const { colors, spacing } = useThemeStore();
  const tags = JSON.parse(bookmark.tags || "[]") as string[];
  const imageUri = bookmark.local_path || bookmark.image_url;

  const handleCopy = () => {
    if (imageUri) {
      Clipboard.setString(imageUri);
      Alert.alert("Copied", "Image URL copied to clipboard");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
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
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            Image
          </Text>
          
          <View style={styles.headerActions}>
            <Pressable onPress={handleCopy} style={styles.headerButton}>
              <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={[styles.noImage, { backgroundColor: colors.elevated }]}>
              <Ionicons name="image-outline" size={64} color={colors.textTertiary} />
              <Text style={[styles.noImageText, { color: colors.textTertiary }]}>
                No image available
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {bookmark.title && (
            <Text style={[styles.imageTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {bookmark.title}
            </Text>
          )}

          {tags.length > 0 && (
            <View style={[styles.tagsContainer, { gap: spacing.xs }]}>
              {tags.slice(0, 4).map((tag, index) => (
                <TagChip key={index} tag={tag} small />
              ))}
            </View>
          )}

          <View style={[styles.metadata, { gap: spacing.md }]}>
            <View style={styles.metadataItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {getRelativeTime(bookmark.created_at)}
              </Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons 
                name={bookmark.is_public ? "globe-outline" : "lock-closed-outline"} 
                size={14} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.metadataText, { color: colors.textTertiary }]}>
                {bookmark.is_public ? "Public" : "Private"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.toolbar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable style={styles.toolbarButton} onPress={handleCopy}>
            <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.toolbarText, { color: colors.textPrimary }]}>Copy</Text>
          </Pressable>
          
          <Pressable style={styles.toolbarButton} onPress={onTogglePublic}>
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
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
  },
  noImage: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_HEIGHT * 0.4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noImageText: {
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  imageTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
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
