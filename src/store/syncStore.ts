import { create } from 'zustand';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

/**
 * CLINICAL SCHEMA CONFIGURATION
 * This map ensures that data coming from Supabase satisfies 
 * every "NOT NULL" constraint in your V3 PGlite architecture.
 */
const SCHEMA_CONFIG = [

  { 
    name: 'clinical_records', 
    cols: ['id', 'animal_id', 'record_type', 'record_date', 'soap_assessment', 'is_deleted'], 
    defaults: { record_type: 'GENERAL', soap_assessment: '', is_deleted: false } 
  },
  { 
    name: 'clinical_schedule', 
    cols: ['id', 'animal_id', 'schedule_type', 'title', 'status', 'is_deleted'], 
    defaults: { schedule_type: 'CHECKUP', status: 'PENDING', is_deleted: false } 
  },
  { 
    name: 'daily_rounds', 
    cols: ['id', 'animal_id', 'date', 'shift', 'is_alive', 'is_deleted'], 
    defaults: { shift: 'AM', is_alive: true, is_deleted: false } 
  },
  { 
    name: 'tasks', 
    cols: ['id', 'title', 'status', 'is_deleted'], 
    defaults: { status: 'PENDING', is_deleted: false } 
  },
  { 
    name: 'users', 
    cols: ['id', 'email', 'name', 'role', 'is_deleted'], 
    defaults: { role: 'KEEPER', is_deleted: false } 
  },
  {
    name: 'maintenance_tickets',
    cols: ['id', 'title', 'category', 'status', 'priority', 'is_deleted'],
    defaults: { category: 'GENERAL', status: 'OPEN', priority: 'MEDIUM', is_deleted: false }
  }
];

type SyncState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastSynced: string | null;
  progress: string;
  pullFromCloud: () => Promise<void>;
  startBackgroundWorker: () => void;
};

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'disconnected',
  lastSynced: null,
  progress: 'Idle',

  pullFromCloud: async () => {
    if (get().status === 'connecting') return;
    set({ status: 'connecting', progress: 'Synchronizing Vault...' });

    try {
      await db.waitReady;

      for (const table of SCHEMA_CONFIG) {
        set({ progress: `Mirroring ${table.name}...` });
        
        const { data, error } = await supabase
          .from(table.name)
          .select(table.cols.join(','));

        if (error) {
          console.warn(`[Sync] Table ${table.name} skipped:`, error.message);
          continue; 
        }

        if (data && data.length > 0) {
          await db.query('BEGIN');
          try {
            for (const row of data) {
              const columns = table.cols;
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              const updateSet = columns
                .filter(c => c !== 'id')
                .map((c) => `${c} = EXCLUDED.${c}`)
                .join(', ');

              const values = columns.map(col => {
                const val = row[col];
                // THE PROTECTION LAYER:
                // If the cloud value is null, use the clinical default
                if (val === null || val === undefined) {
                  const fallback = table.defaults[col as keyof typeof table.defaults];
                  return fallback !== undefined ? fallback : null;
                }
                return val;
              });

              const sql = `
                INSERT INTO ${table.name} (${columns.join(', ')})
                VALUES (${placeholders})
                ON CONFLICT (id) DO UPDATE SET ${updateSet}
              `;

              await db.query(sql, values);
            }
            await db.query('COMMIT');
          } catch (e) {
            await db.query('ROLLBACK');
            throw e;
          }
        }
      }

      set({ 
        status: 'connected', 
        lastSynced: new Date().toISOString(),
        progress: 'Sync Complete' 
      });
      console.log('[Sync Engine] All Clinical Records Mirrored.');

    } catch (err) {
      console.error('[Sync Engine] Sync failed:', err);
      set({ status: 'error', progress: 'Sync Failed' });
    }
  },

  startBackgroundWorker: () => {
    console.log('[Sync Engine] Background heartbeat initialized.');
    // Auto-sync every 5 minutes
    const interval = setInterval(() => {
      if (get().status !== 'connecting') {
        get().pullFromCloud();
      }
    }, 300000);
    
    return () => clearInterval(interval);
  }
}));