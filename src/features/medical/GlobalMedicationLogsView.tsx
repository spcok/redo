import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Pill, Search } from 'lucide-react';

// V3 STRICT TYPE
interface MedicationLogRow {
  id: string;
  administered_at: string;
  status: string;
  notes: string | null;
  schedule_title: string | null;
  animal_name: string | null;
  staff_name: string | null;
}

export function GlobalMedicationLogsView() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['global_medication_logs'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT l.*, s.title as schedule_title, a.name as animal_name, u.name as staff_name
        FROM medication_logs l
        LEFT JOIN clinical_schedule s ON l.schedule_id = s.id
        LEFT JOIN animals a ON l.animal_id = a.id
        LEFT JOIN users u ON l.administered_by = u.id
        WHERE l.is_deleted = false
        ORDER BY l.administered_at DESC LIMIT 100
      `);
      return res.rows as MedicationLogRow[];
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex items-center gap-3">
        <Pill className="text-indigo-500" size={28}/> 
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Medication History (MAR Log)</h1>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">
                  {new Date(l.administered_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 font-bold text-sm text-indigo-600 uppercase tracking-tight">{l.animal_name}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-800">{l.schedule_title || 'Unknown Schedule'}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    l.status === 'ADMINISTERED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    l.status === 'MISSED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  {l.staff_name || 'System'}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Search className="mx-auto mb-3 opacity-20" size={32} />
                  <p className="font-bold text-xs uppercase tracking-widest">No MAR logs found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}