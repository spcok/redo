import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useAuthStore } from '../../../store/authStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper to ensure dummy user IDs don't crash Postgres UUID columns
const getSafeUUID = (id: string | undefined) => {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  // Standard UUID regex check
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  return isUUID ? id : '00000000-0000-0000-0000-000000000000';
};

export function ClockInOutButton() {
  const rawUserId = useAuthStore(s => s.session?.user?.id);
  const currentUserId = getSafeUUID(rawUserId);
  const queryClient = useQueryClient();

  const { data: activeShift, isLoading } = useQuery({
    queryKey: ['active_shift', currentUserId],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(
        `SELECT id, clock_in_time FROM timesheets WHERE user_id = $1 AND status = 'CLOCKED_IN' AND is_deleted = false ORDER BY clock_in_time DESC LIMIT 1`,
        [currentUserId]
      );
      return res.rows.length > 0 ? (res.rows[0] as { id: string, clock_in_time: string }) : null;
    }
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      await db.waitReady;
      // Get strict YYYY-MM-DD for the shift_date column
      const shiftDate = new Date().toISOString().split('T')[0];
      
      await db.query(
        `INSERT INTO timesheets (user_id, shift_date, status, created_by, modified_by) 
         VALUES ($1, $2, 'CLOCKED_IN', $1, $1)`, 
        [currentUserId, shiftDate]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Clocked In Successfully");
    },
    onError: (err) => {
      console.error("Clock In Error:", err);
      toast.error(`Database Error: ${err.message}`);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      await db.waitReady;
      await db.query(
        `UPDATE timesheets SET status = 'CLOCKED_OUT', clock_out_time = now(), modified_by = $1, updated_at = now() WHERE id = $2`, 
        [currentUserId, shiftId]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_shift'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Clocked Out Successfully");
    },
    onError: (err) => {
      console.error("Clock Out Error:", err);
      toast.error(`Database Error: ${err.message}`);
    }
  });

  if (isLoading) return null;

  if (activeShift) {
    return (
      <div className="flex items-center gap-3">
         <span className="hidden md:inline-flex text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-md border border-emerald-200 tracking-widest shadow-sm">
            Active Shift
         </span>
         <button 
           onClick={() => clockOutMutation.mutate(activeShift.id)}
           disabled={clockOutMutation.isPending}
           className="px-5 py-1.5 border border-rose-500 text-rose-600 font-bold tracking-wide text-sm uppercase rounded-full hover:bg-rose-50 transition-colors bg-white shadow-sm disabled:opacity-50 flex items-center gap-2"
         >
           {clockOutMutation.isPending && <Loader2 size={14} className="animate-spin" />}
           {clockOutMutation.isPending ? 'Processing' : 'Clock Out'}
         </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => clockInMutation.mutate()}
      disabled={clockInMutation.isPending}
      className="px-5 py-1.5 border border-emerald-500 bg-emerald-500 text-white font-bold tracking-wide text-sm uppercase rounded-full hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
    >
      {clockInMutation.isPending && <Loader2 size={14} className="animate-spin" />}
      {clockInMutation.isPending ? 'Processing' : 'Clock In'}
    </button>
  );
}