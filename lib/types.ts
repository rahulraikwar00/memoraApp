import { Ionicons } from "@expo/vector-icons";
import { Bookmark } from "./db";

export type ContentType = "link" | "image" | "note" | "voice";

export const getContentType = (bookmark: Bookmark): ContentType => {
  if (bookmark.domain === "local-image") return "image";
  if (bookmark.domain === "local-note") return "note";
  if (bookmark.domain === "local-voice") return "voice";
  return "link";
};

export const getContentIcon = (
  type: ContentType
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "image":
      return "image";
    case "note":
      return "document-text";
    case "voice":
      return "mic";
    default:
      return "globe-outline";
  }
};

export const getContentLabel = (type: ContentType): string => {
  switch (type) {
    case "image":
      return "Image";
    case "note":
      return "Note";
    case "voice":
      return "Voice";
    default:
      return "Link";
  }
};