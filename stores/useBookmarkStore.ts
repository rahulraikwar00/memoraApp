import { create } from 'zustand';
import { Bookmark, getBookmarks, createBookmark, deleteBookmark, toggleBookmarkPublic, toggleBookmarkFavorite, searchBookmarks } from '../lib/db';

interface BookmarkState {
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  loadBookmarks: () => Promise<void>;
  addBookmark: (data: Omit<Bookmark, 'id' | 'created_at' | 'updated_at' | 'synced_at' | 'is_deleted' | 'is_favorite'>) => Promise<Bookmark | null>;
  updateBookmark: (id: string, data: Partial<Omit<Bookmark, 'id' | 'created_at'>>) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  togglePublic: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearError: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  loadBookmarks: async () => {
    set({ isLoading: true, error: null });
    try {
      console.log('Loading bookmarks from DB...');
      const bookmarks = await getBookmarks();
      console.log('Loaded bookmarks:', bookmarks.length);
      set({ bookmarks: bookmarks.filter(b => !b.is_deleted), isLoading: false });
    } catch (err) {
      console.error('Load bookmarks error:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  addBookmark: async (data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Creating bookmark:', data.url);
      const bookmark = await createBookmark(data);
      console.log('Created bookmark:', bookmark.id);
      const { bookmarks } = get();
      set({ bookmarks: [bookmark, ...bookmarks], isLoading: false });
      return bookmark;
    } catch (err) {
      console.error('Add bookmark error:', err);
      set({ error: (err as Error).message, isLoading: false });
      return null;
    }
  },

  updateBookmark: async (id, data) => {
    try {
      const { updateBookmark: dbUpdateBookmark, getBookmarkById } = await import('../lib/db');
      await dbUpdateBookmark(id, data);
      const updated = await getBookmarkById(id);
      if (updated) {
        const { bookmarks } = get();
        set({ bookmarks: bookmarks.map(b => b.id === id ? updated : b) });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removeBookmark: async (id: string) => {
    const { bookmarks } = get();
    set({ bookmarks: bookmarks.filter(b => b.id !== id) });

    try {
      await deleteBookmark(id);
      console.log('Successfully deleted bookmark from DB:', id);
    } catch (err) {
      console.error('Failed to delete bookmark from DB:', err);
      await get().loadBookmarks();
      set({ error: (err as Error).message });
    }
  },

  togglePublic: async (id: string) => {
    try {
      const updated = await toggleBookmarkPublic(id);
      if (updated) {
        const { bookmarks } = get();
        set({ bookmarks: bookmarks.map(b => b.id === id ? updated : b) });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const updated = await toggleBookmarkFavorite(id);
      if (updated) {
        const { bookmarks } = get();
        set({ bookmarks: bookmarks.map(b => b.id === id ? updated : b) });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  performSearch: async (query: string) => {
    set({ isLoading: true, searchQuery: query });
    try {
      const bookmarks = query.trim() ? await searchBookmarks(query) : await getBookmarks();
      set({ bookmarks: bookmarks.filter(b => !b.is_deleted), isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
