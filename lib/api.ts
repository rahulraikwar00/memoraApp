import { Constants } from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../stores/useAuthStore";

const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }
  return "http://localhost:3000";
};

const API_URL = getApiUrl();

export interface ApiError {
  message: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private maxRetries: number = 2;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getToken(): Promise<string | null> {
    return useAuthStore.getState().token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 0,
  ): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await useAuthStore.getState().setToken(null);
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (retries < this.maxRetries && this.isNetworkError(error)) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retries + 1)),
        );
        return this.request<T>(endpoint, options, retries + 1);
      }
      throw error;
    }
  }

  private isNetworkError(error: unknown): boolean {
    return error instanceof TypeError && error.message.includes("Network");
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_URL);

export interface FeedItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  image_url?: string;
  domain: string;
  tags: string[];
  save_count: number;
  created_at: number;
}

export interface FeedResponse {
  trending: FeedItem[];
  recent: FeedItem[];
}

export interface PreviewMetadata {
  title: string | null;
  description: string | null;
  image_url: string | null;
  domain: string;
  url: string;
}

export const feedApi = {
  getFeed: (tags?: string[], limit?: number) => {
    const params = new URLSearchParams();
    if (tags && tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (limit) {
      params.set('limit', limit.toString());
    }
    const query = params.toString();
    return api.get<FeedResponse>(`/api/feed${query ? `?${query}` : ''}`);
  },
  vote: (id: string) =>
    api.post<{ success: boolean }>(`/api/vote`, { item_id: id }),
};

export const metadataApi = {
  getPreview: (url: string) =>
    api.get<PreviewMetadata>(`/api/preview?url=${encodeURIComponent(url)}`),
};

export interface SyncPayload {
  bookmarks: unknown[];
  queue: unknown[];
}

export const syncApi = {
  sync: (payload: SyncPayload) =>
    api.post<{ success: boolean; synced: number }>("/api/sync", payload),
};

export interface CheckUsernameResponse {
  available: boolean;
}

export interface RegisterUserResponse {
  success: boolean;
  username: string;
  error?: string;
}

export const authApi = {
  checkUsername: (username: string) =>
    api.get<CheckUsernameResponse>(
      `/api/auth/check-username?username=${encodeURIComponent(username)}`
    ),
  register: (id: string, username: string, avatarUrl?: string) =>
      api.post<RegisterUserResponse>("/api/auth/register", {
        id,
        username,
        avatar_url: avatarUrl,
      }),
};
