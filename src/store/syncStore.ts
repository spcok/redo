import { create } from 'zustand';
import { db } from '../lib/db';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncErrors: string[];
  initSync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncTime: null,
  syncErrors: [],

  initSync: async () => {
    try {
      set({ isSyncing: true });
      await db.waitReady;
      
      // The base URL for your Zrok tunnel
      const ZROK_BASE_URL = 'https://xpodjreg4ltb.share.zrok.io';
      // Electric V2 exposes HTTP shapes on the /v1/shape path
      const SHAPE_URL = `${ZROK_BASE_URL}/v1/shape`;

      if (!(db.pg as any).sync) {
        throw new Error("Electric Sync extension not found on PGlite instance.");
      }

      console.log(`[Sync Engine] Connecting to V2 HTTP Shapes at: ${SHAPE_URL}`);
      
      // =====================================================================
      // 🚀 THE V2 FIX: Explicitly subscribe to HTTP Shapes for core tables
      // =====================================================================
      const tablesToSync = [
        'users',
        'animals',
        'tasks',
        'safety_incidents',
        'timesheets',
        'daily_logs',
        'daily_rounds',
        'clinical_schedule',
        'clinical_records'
      ];

      // Initialize all shape streams concurrently. 
      // syncShapeToTable resolves when the initial snapshot finishes downloading,
      // and then it silently continues to poll for updates in the background.
      await Promise.all(tablesToSync.map(table => 
        (db.pg as any).sync.syncShapeToTable({
          shape: {
            url: SHAPE_URL,
            table: table
          }
        })
      ));

      console.log('✅ [Sync Engine] All Clinical HTTP Shapes Mirrored.');
      set({ isSyncing: false, lastSyncTime: new Date().toISOString(), syncErrors: [] });

      // Background heartbeat to update UI state
      setInterval(() => {
        const isNowOnline = navigator.onLine;
        set({ isOnline: isNowOnline });
        if (isNowOnline) {
          set({ lastSyncTime: new Date().toISOString() });
        }
      }, 30000);

    } catch (err: any) {
      console.error('🚨 [Sync Engine] Sync failed:', err.message);
      set({ isSyncing: false, syncErrors: [err.message] });
    }
  }
}));

// Setup event listeners for network status
window.addEventListener('online', () => useSyncStore.setState({ isOnline: true }));
window.addEventListener('offline', () => useSyncStore.setState({ isOnline: false }));