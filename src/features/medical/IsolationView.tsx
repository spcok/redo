import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, ShieldAlert, CheckCircle, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface IsolationLog {
  id: string;
  animal_id: string;
  isolation_type: 'QUARANTINE_NEW_ARRIVAL' | 'QUARANTINE_ILLNESS' | 'MEDICAL_INJURY' | 'BEHAVIORAL';
  start_date: string;
  location: string;
  reason_notes: string | null;
  status: 'ACTIVE' | 'CLEARED';
  animal_name?: string | null;
  species?: string | null;
}

interface AnimalOption {
  id: string;
  name: string;
}

// V3 FIX: Removed .default('NONE'). Replaced with true Optional/Nullable.
const isolationSchema = z.object({
  animal_id: z.string().min(1, "Animal required"),
  isolation_type: z.enum(['QUARANTINE_NEW_ARRIVAL', 'QUARANTINE_ILLNESS', 'MEDICAL_INJURY', 'BEHAVIORAL']),
  start_date: z.string().min(1, "Start date required"),
  location: z.string().min(1, "Location required"),
  reason_notes: z.string().nullable().optional(),
});

type IsolationFormValues = z.infer<typeof isolationSchema>;

function IsolationModal({ isOpen, onClose, animals, editRecord }: { isOpen: boolean, onClose: () => void, animals: AnimalOption[], editRecord: IsolationLog | null }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: IsolationFormValues) => {
      await db.waitReady;
      
      const params = [
        val.animal_id, val.isolation_type, val.start_date, val.location, 
        val.reason_notes || null, currentUserId
      ];

      if (editRecord) {
        await db.query(
          `UPDATE isolation_logs SET 
            animal_id=$1, isolation_type=$2, start_date=$3, location=$4, 
            reason_notes=$5, modified_by=$6, updated_at=now() 
           WHERE id = $7`,
          [...params, editRecord.id]
        );
      } else {
        await db.query(
          `INSERT INTO isolation_logs (
            animal_id, isolation_type, start_date, location, reason_notes, status, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, $6)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isolations_master'] });
      toast.success(editRecord ? 'Isolation updated' : 'Isolation logged');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      animal_id: editRecord?.animal_id || '',
      isolation_type: editRecord?.isolation_type || 'MEDICAL_INJURY',
      start_date: editRecord ? new Date(editRecord.start_date).toISOString().slice(0, 10) : new Date().toISOString().split('T')[0],
      location: editRecord?.location || '',
      reason_notes: editRecord?.reason_notes || ''
    } as IsolationFormValues,
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-500" />
            {editRecord ? 'Edit Isolation' : 'Move to Isolation'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="isolation-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
            <form.Field name="animal_id">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-rose-500 uppercase">Patient / Animal *</label>
                  <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500">
                    <option value="">-- Select --</option>
                    {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="isolation_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-rose-500 uppercase">Type *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500">
                      <option value="QUARANTINE_NEW_ARRIVAL">New Arrival</option>
                      <option value="QUARANTINE_ILLNESS">Illness Suspected</option>
                      <option value="MEDICAL_INJURY">Medical / Injury</option>
                      <option value="BEHAVIORAL">Behavioral</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="start_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-rose-500 uppercase">Start Date *</label>
                    <input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500" />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="location">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-rose-500 uppercase">Location (Enclosure/Pen) *</label>
                  <input placeholder="e.g. Vet Block Pen 3" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500" />
                </div>
              )}
            </form.Field>

            <form.Field name="reason_notes">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-rose-500 uppercase">Reason / Notes</label>
                  <textarea placeholder="Optional notes for the team..." value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-rose-500" />
                </div>
              )}
            </form.Field>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="isolation-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null} Save Status
          </button>
        </div>
      </div>
    </div>
  );
}

export function IsolationView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<IsolationLog | null>(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const { data: isolations = [], isLoading } = useQuery({
    queryKey: ['isolations_master'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT i.*, a.name as animal_name, a.species 
        FROM isolation_logs i 
        LEFT JOIN animals a ON i.animal_id = a.id 
        WHERE i.is_deleted = false 
        ORDER BY CASE WHEN i.status = 'ACTIVE' THEN 1 ELSE 2 END ASC, i.start_date DESC
      `);
      return res.rows as IsolationLog[];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await db.waitReady;
      await db.query(`UPDATE isolation_logs SET status = $1, modified_by = $2, updated_at = now() WHERE id = $3`, [newStatus, currentUserId, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['isolations_master'] })
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-rose-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-rose-500" size={28}/> Isolation Ward Logs
        </h1>
        <button onClick={() => { setRecordToEdit(null); setIsModalOpen(true); }} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-colors">
          <Plus size={18}/> Log Isolation
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Location</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isolations.map((iso) => (
              <tr key={iso.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3 text-xs font-bold text-slate-600">{new Date(iso.start_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-indigo-600 uppercase tracking-tight">{iso.animal_name}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{iso.species}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[9px] font-black uppercase bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 rounded shadow-sm mr-2">{iso.isolation_type.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-bold text-slate-600">@ {iso.location}</span>
                </td>
                <td className="px-4 py-3">
                  {iso.status === 'ACTIVE' ? (
                    <button onClick={() => updateStatus.mutate({ id: iso.id, newStatus: 'CLEARED' })} className="flex items-center gap-1 text-[10px] font-black uppercase bg-rose-500 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-rose-600 transition-colors">
                      Clear Patient
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg w-fit border border-emerald-200">
                      <CheckCircle size={12}/> Cleared
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setRecordToEdit(iso); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-200 rounded-md">
                    <Edit2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {isolations.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No isolation records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <IsolationModal 
          key={recordToEdit ? recordToEdit.id : 'new'} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          animals={animals} 
          editRecord={recordToEdit} 
        />
      )}
    </div>
  );
}