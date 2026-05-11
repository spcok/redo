import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Clock, CalendarDays, CheckCircle, Search } from 'lucide-react';

interface TimesheetRow {
  id: string;
  user_id: string;
  shift_date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  status: string;
  name: string | null;
  email: string | null;
}

export function TimesheetView() {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const { data: timesheets = [], isLoading, isError, error } = useQuery({
    queryKey: ['timesheets', dateFilter],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(
        `SELECT t.*, u.name, u.email FROM timesheets t 
         LEFT JOIN users u ON t.user_id = u.id 
         WHERE t.shift_date::text LIKE $1 || '%' AND t.is_deleted = false 
         ORDER BY t.clock_in_time DESC`,
        [dateFilter]
      );
      return res.rows as TimesheetRow[];
    }
  });

  const getDuration = (inTime: string, outTime: string | null, status: string) => {
    if (status === 'CLOCKED_IN' || !outTime) return "Active Shift";
    const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;
  if (isError) return <div className="p-6 text-center text-rose-500 font-bold">Database Error: {error?.message}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Clock className="text-slate-500" size={28}/> Daily Timesheets
        </h1>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm w-fit">
          <CalendarDays size={18} className="text-slate-400 ml-2" />
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-sm font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff Member</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock In</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock Out</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timesheets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800 uppercase tracking-tight">{t.name || t.email || 'Current User (System Default)'}</p>
                </td>
                <td className="px-4 py-3 text-sm font-mono font-bold text-slate-600">
                  {new Date(t.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-sm font-mono font-bold text-slate-600">
                  {t.status === 'CLOCKED_IN' || !t.clock_out_time ? '--:--' : new Date(t.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-sm font-black text-slate-700">
                  {getDuration(t.clock_in_time, t.clock_out_time, t.status)}
                </td>
                <td className="px-4 py-3">
                  {t.status === 'CLOCKED_IN' ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md w-fit shadow-sm">
                      <Loader2 size={12} className="animate-spin" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md w-fit">
                      <CheckCircle size={12} /> Closed
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {timesheets.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-400">
                  <Search className="mx-auto mb-3 opacity-20" size={32} />
                  <p className="font-bold text-xs uppercase tracking-widest">No timesheets found for this date.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}