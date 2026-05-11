import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, X, Save, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnimalOption {
  id: string;
  name: string;
  species: string | null;
}

interface UserOption {
  id: string;
  name: string;
}

const scheduleSchema = z.object({
  animal_id: z.string().min(1, "Patient required"),
  title: z.string().min(1, "Title required"),
  schedule_type: z.enum(['MEDICATION', 'VET_CHECK', 'VACCINATION', 'PARASITE_TREATMENT', 'OTHER']),
  start_date: z.string().min(1, "Start Date required"),
  end_date: z.string().nullable().optional(),
  frequency: z.string().min(1, "Frequency required"),
  assigned_to: z.string().nullable().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export function AddClinicalScheduleModal({ isOpen, onClose, animalId }: { isOpen: boolean, onClose: () => void, animalId?: string }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name, species FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM users WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as UserOption[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (val: ScheduleFormValues) => {
      await db.waitReady;
      await db.query(
        `INSERT INTO clinical_schedule (
          animal_id, schedule_type, title, start_date, end_date, frequency, 
          status, assigned_to, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $8)`,
        [
          val.animal_id, val.schedule_type, val.title, val.start_date, val.end_date || null,
          val.frequency, val.assigned_to || null, currentUserId
        ]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_clinical_schedule'] });
      toast.success('Clinical schedule created');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      animal_id: animalId || '',
      title: '',
      schedule_type: 'MEDICATION',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      frequency: 'ONCE_DAILY',
      assigned_to: ''
    } as ScheduleFormValues,
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
            <CalendarClock size={20} className="text-indigo-500" /> New Clinical Schedule
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="schedule-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
            
            {!animalId && (
              <form.Field name="animal_id">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-indigo-500 uppercase">Patient *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Select Patient --</option>
                      {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            )}

            <form.Field name="title">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Schedule Title *</label>
                  <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="e.g. Metacam Course" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="schedule_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Type *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                      <option value="MEDICATION">Medication</option>
                      <option value="VET_CHECK">Vet Check</option>
                      <option value="VACCINATION">Vaccination</option>
                      <option value="PARASITE_TREATMENT">Parasite Tx</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="frequency">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Frequency *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                      <option value="ONCE_DAILY">Once Daily (SID)</option>
                      <option value="TWICE_DAILY">Twice Daily (BID)</option>
                      <option value="THREE_TIMES_DAILY">Three Times (TID)</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="AS_NEEDED">As Needed (PRN)</option>
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="start_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Start Date *</label>
                    <input type="date" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
              <form.Field name="end_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">End Date (Optional)</label>
                    <input type="date" value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="assigned_to">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Assigned Staff (Optional)</label>
                  <select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Unassigned --</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
            </form.Field>

          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="schedule-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Create Schedule
          </button>
        </div>
      </div>
    </div>
  );
}