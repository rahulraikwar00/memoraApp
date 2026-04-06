import { Bookmark } from './db';

export type ContentType = 'link' | 'image' | 'note' | 'voice';

export const getContentType = (bookmark: Bookmark): ContentType => {
  if (bookmark.domain === 'local-image') return 'image';
  if (bookmark.domain === 'local-note') return 'note';
  if (bookmark.domain === 'local-voice') return 'voice';
  return 'link';
};

export interface FilterOptions {
  typeFilter?: ContentType | 'all';
  tagFilter?: string | null;
  query?: string;
}

export const filterBookmarks = (
  bookmarks: Bookmark[],
  options: FilterOptions
): Bookmark[] => {
  const { typeFilter = 'all', tagFilter, query } = options;

  return bookmarks.filter(bookmark => {
    if (typeFilter !== 'all') {
      const type = getContentType(bookmark);
      if (type !== typeFilter) return false;
    }

    if (tagFilter) {
      const tags = JSON.parse(bookmark.tags || '[]') as string[];
      if (!tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase()))) {
        return false;
      }
    }

    if (query) {
      const searchLower = query.toLowerCase();
      const titleMatch = bookmark.title?.toLowerCase().includes(searchLower);
      const domainMatch = bookmark.domain?.toLowerCase().includes(searchLower);
      const urlMatch = bookmark.url?.toLowerCase().includes(searchLower);
      if (!titleMatch && !domainMatch && !urlMatch) {
        return false;
      }
    }

    return true;
  });
};

export const CATEGORY_TYPE_MAP: Record<string, ContentType | 'all'> = {
  'All': 'all',
  'Link': 'link',
  'Image': 'image',
  'Note': 'note',
  'Voice': 'voice',
};
