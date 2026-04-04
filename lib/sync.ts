import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "../stores/useAuthStore";
import { syncApi, SyncPayload } from "./api";
import {
  clearCompletedSyncItems,
  getPendingSyncItems,
  incrementSyncRetry,
  markSyncItemComplete,
} from "./db";

const MAX_RETRIES = 5;
const BASE_DELAY = 1000;
const BATCH_SIZE = 1;

let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let netInfoUnsubscribe: (() => void) | null = null;

export function startSyncWorker(): void {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    if (!isSyncing) {
      await syncNow();
    }
  }, 30000);

  netInfoUnsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (state.isConnected && !isSyncing) {
      await syncNow();
    }
  });

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "active" && !isSyncing) {
      await syncNow();
    }
  };

  AppState.addEventListener("change", handleAppStateChange);
}

export function stopSyncWorker(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}

export async function syncNow(): Promise<void> {
  const { isAuthenticated, token } = useAuthStore.getState();
  console.log("[SYNC_CLIENT] isAuthenticated:", isAuthenticated, "token:", token ? "present" : "null");
  
  // For development/demo: allow sync without auth (remove this check in production)
  if (!isAuthenticated) {
    console.log("[SYNC_CLIENT] Warning: Not authenticated, but proceeding for demo...");
    // return; // Disabled for demo - enable in production
  }

  const netInfo = await NetInfo.fetch();
  console.log("[SYNC_CLIENT] NetInfo isConnected:", netInfo.isConnected);
  if (!netInfo.isConnected) {
    console.log("[SYNC_CLIENT] Skipping sync - no network");
    return;
  }

  isSyncing = true;

  try {
    const pendingItems = await getPendingSyncItems(BATCH_SIZE);
    console.log("[SYNC_CLIENT] Pending items:", pendingItems.length);

    if (pendingItems.length === 0) {
      await clearCompletedSyncItems();
      isSyncing = false;
      return;
    }

    const payload: SyncPayload = {
      bookmarks: pendingItems.map((item) => JSON.parse(item.payload)),
      queue: pendingItems.map((item) => ({
        id: item.id,
        operation: item.operation,
        created_at: item.created_at,
      })),
    };
    console.log("[SYNC_CLIENT] Sending payload with", payload.bookmarks?.length || 0, "bookmarks");

    try {
      const result = await syncApi.sync(payload);
      console.log("[SYNC_CLIENT] Sync result:", result);

      for (const item of pendingItems) {
        await markSyncItemComplete(item.id);
      }

      if (result.synced > 0) {
        console.log(`Synced ${result.synced} items`);
      }
    } catch (error) {
      console.error("Sync failed:", error);

      for (const item of pendingItems) {
        if (item.retry_count >= MAX_RETRIES) {
          continue;
        }
        await incrementSyncRetry(item.id);
      }

      const delay = calculateBackoff(pendingItems[0]?.retry_count || 0);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } finally {
    isSyncing = false;
  }
}

function calculateBackoff(retryCount: number): number {
  const maxDelay = BASE_DELAY * Math.pow(2, MAX_RETRIES);
  const delay = BASE_DELAY * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

export async function triggerSync(): Promise<void> {
  if (!isSyncing) {
    await syncNow();
  }
}
