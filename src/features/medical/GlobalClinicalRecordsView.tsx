import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Stethoscope, Plus, Search } from 'lucide-react';
// V3 FIX: Adjusted import path to point to the local medical components folder
import { AddClinicalRecordModal } from './components/AddClinicalRecordModal';

// V3 STRICT TYPE
interface ClinicalRecordRow {
  id: string;
  record_date: string;
  record_type: string;
  diagnosis: string | null;
  animal_name: string | null;
  staff_name: string | null;
}

export function GlobalClinicalRecordsView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['global_clinical_records'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT c.*, a.name as animal_name, u.name as staff_name 
        FROM clinical_records c 
        LEFT JOIN animals a ON c.animal_id = a.id 
        LEFT JOIN users u ON c.conducted_by = u.id 
        WHERE c.is_deleted = false 
        ORDER BY c.record_date DESC LIMIT 100
      `);
      return res.rows as ClinicalRecordRow[];
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Stethoscope className="text-indigo-500" size={28}/> Clinical Records
        </h1>
        <button onClick={() => { setSelectedAnimalId(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-colors">
          <Plus size={18}/> Add Record
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Role</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">
                  {new Date(r.record_date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 font-bold text-sm text-indigo-600 uppercase tracking-tight">{r.animal_name}</td>
                <td className="px-4 py-3">
                  <span className="text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded shadow-sm mr-2">
                    {r.record_type ? r.record_type.replace('_', ' ') : 'GENERAL'}
                  </span>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                    {r.staff_name || 'Staff'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-slate-700 max-w-md truncate">
                    {r.diagnosis || 'No specific diagnosis recorded.'}
                  </p>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <Search className="mx-auto mb-3 opacity-20" size={32} />
                  <p className="font-bold text-xs uppercase tracking-widest">No clinical records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddClinicalRecordModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          animalId={selectedAnimalId || ''} 
        />
      )}
    </div>
  );
}