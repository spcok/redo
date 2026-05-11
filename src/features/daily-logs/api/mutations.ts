import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/db'; // Adjust path to your db.ts

// Obeys Type Law: Strictly define what the form will pass us
interface AddLogPayload {
  animal_id: string;
  log_type: 'feed' | 'weight' | 'observation' | 'medical'; // Match your actual types
  log_date: Date;
  notes?: string | null;
  weight_grams?: number | null;
  weight_unit?: string | null;
}

export const useAddDailyLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddLogPayload) => {
      // Obeys Database Law: Strictly local parameterized query
      await db.query(
        `INSERT INTO daily_logs (
          animal_id, log_type, log_date, notes, weight_grams, weight_unit
        ) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          payload.animal_id,
          payload.log_type,
          payload.log_date.toISOString(), // Standardize to ISO for timestamptz
          payload.notes || null,          // Obeys Null Law
          payload.weight_grams || null,
          payload.weight_unit || null
        ]
      );
    },
    onSuccess: () => {
      // THE MAGIC LINK: This forces the Dashboard to instantly refresh 
      // the stat cards and "Last Fed" columns when a new log is saved.
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      
      // Also invalidate any specific animal log queries you might build later
      queryClient.invalidateQueries({ queryKey: ['dailyLogs'] });
    },
  });
};