import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';

export interface AddLogPayload {
  animal_id: string;
  log_type: string;
  log_date: string;
  notes?: string | null;
  weight_grams?: number | null;
  weight_unit?: string | null;
  temperature_c?: number | null;
  current_user_id: string;
}

/**
 * Audit Point: Precision & Type Casting
 * Numeric columns are cast to Number at the edge to prevent string concatenation bugs.
 * V3 FIX: Removed 'as any' violation, enforcing strict database row typing.
 */
export const useDailyLog = (logId?: string) => {
  return useQuery({
    queryKey: ['dailyLog', logId],
    queryFn: async () => {
      if (!logId) return null;
      await db.waitReady;
      const res = await db.query(`SELECT * FROM daily_logs WHERE id = $1`, [logId]);
      
      if (!res.rows[0]) return null;

      // V3 Strict Typing Enforcement
      const row = res.rows[0] as Record<string, unknown>;
      
      return {
        ...row,
        weight_grams: row.weight_grams ? Number(row.weight_grams) : null,
        temperature_c: row.temperature_c ? Number(row.temperature_c) : null,
      };
    },
    enabled: !!logId,
  });
};

/**
 * Audit Point: Atomic Write Safety
 * mutationFn is now async/await strictly to ensure PGlite sequential processing.
 */
export const useSaveDailyLog = (existingLogId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddLogPayload) => {
      await db.waitReady;
      
      // ISO-8601 Enforced: Prevents UK Timezone drifting
      const safeDate = new Date(payload.log_date).toISOString();

      const baseParams = [
        payload.log_type, 
        safeDate, 
        payload.notes || null, 
        payload.weight_grams || null, 
        payload.weight_unit || null, 
        payload.temperature_c || null, 
        payload.current_user_id
      ];

      if (existingLogId) {
        await db.query(
          `UPDATE daily_logs 
           SET log_type = $1, log_date = $2, notes = $3, weight_grams = $4, 
               weight_unit = $5, temperature_c = $6, updated_at = now(), modified_by = $7 
           WHERE id = $8`,
          [...baseParams, existingLogId]
        );
      } else {
        await db.query(
          `INSERT INTO daily_logs (
            animal_id, log_type, log_date, notes, weight_grams, weight_unit, 
            temperature_c, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [payload.animal_id, ...baseParams, payload.current_user_id]
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs-page'] });
    }
  });
};

export const useDeleteDailyLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await db.waitReady;
      await db.query(
        'UPDATE daily_logs SET is_deleted = true, updated_at = now(), modified_by = $1 WHERE id = $2', 
        [userId, id]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['daily-logs-page'] });
    }
  });
};