import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, CalendarClock, Plus, Search } from 'lucide-react';
// V3 FIX: Adjusted import path to point to the local medical components folder
import { AddClinicalScheduleModal } from './components/AddClinicalScheduleModal';

// V3 STRICT TYPE
interface ClinicalScheduleRow {
  id: string;
  title: string;
  schedule_type: string;
  start_date: string;
  end_date: string;
  status: string;
  animal_name: string | null;
  species: string | null;
  animal_id: string;
}

export function GlobalMedicalScheduleView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['global_clinical_schedule'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT c.*, a.name as animal_name, a.species 
        FROM clinical_schedule c 
        LEFT JOIN animals a ON c.animal_id = a.id 
        WHERE c.is_deleted = false 
        ORDER BY c.start_date DESC LIMIT 100
      `);
      return res.rows as ClinicalScheduleRow[];
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <CalendarClock className="text-indigo-500" size={28}/> Clinical Schedule
        </h1>
        <button onClick={() => { setSelectedAnimalId(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-colors">
          <Plus size={18}/> New Schedule
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title / Schedule</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-indigo-600 uppercase tracking-tight">{s.animal_name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.species}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800">{s.title}</p>
                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {s.schedule_type ? s.schedule_type.replace('_', ' ') : 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-bold text-slate-600">
                  {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md border ${
                    s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <Search className="mx-auto mb-3 opacity-20" size={32} />
                  <p className="font-bold text-xs uppercase tracking-widest">No schedules active</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddClinicalScheduleModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          animalId={selectedAnimalId || ''} 
        />
      )}
    </div>
  );
}