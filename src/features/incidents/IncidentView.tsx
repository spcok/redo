import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, AlertTriangle, Edit2, Trash2, HeartPulse, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface Incident {
  id: string;
  incident_date: string;
  person_involved_name: string;
  person_type: 'STAFF' | 'VISITOR' | 'CONTRACTOR' | 'VOLUNTEER';
  location: string;
  incident_description: string | null;
  injury_details: string | null;
  treatment_provided: string | null;
  outcome: 'RETURNED_TO_NORMAL' | 'WENT_HOME' | 'HOSPITAL' | 'FATAL';
  is_riddor_reportable: boolean;
  witness_details: string | null;
  animal_involved: boolean;
  linked_animal_id: string | null;
  animal_name?: string | null;
}

interface AnimalOption {
  id: string;
  name: string;
}

const incidentSchema = z.object({
  incident_date: z.string().min(1, "Date/Time required"),
  person_involved_name: z.string().min(1, "Name required"),
  person_type: z.enum(['STAFF', 'VISITOR', 'CONTRACTOR', 'VOLUNTEER']),
  location: z.string().min(1, "Location required"),
  incident_description: z.string().nullable().optional(),
  injury_details: z.string().nullable().optional(),
  treatment_provided: z.string().nullable().optional(),
  outcome: z.enum(['RETURNED_TO_NORMAL', 'WENT_HOME', 'HOSPITAL', 'FATAL']),
  is_riddor_reportable: z.boolean(),
  witness_details: z.string().nullable().optional(),
  animal_involved: z.boolean(),
  linked_animal_id: z.string().nullable().optional()
});

type IncidentFormValues = z.infer<typeof incidentSchema>;

function IncidentModal({ isOpen, onClose, animals, editIncident }: { isOpen: boolean, onClose: () => void, animals: AnimalOption[], editIncident: Incident | null }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: IncidentFormValues) => {
      await db.waitReady;
      
      const params = [
        val.incident_date,
        val.person_involved_name,
        val.person_type,
        val.location,
        val.incident_description || null,
        val.injury_details || null,
        val.treatment_provided || null,
        val.outcome,
        val.is_riddor_reportable,
        val.witness_details || null,
        val.animal_involved,
        val.animal_involved && val.linked_animal_id ? val.linked_animal_id : null,
        currentUserId
      ];

      if (editIncident) {
        await db.query(
          `UPDATE incidents SET 
            incident_date = $1, person_involved_name = $2, person_type = $3, location = $4, 
            incident_description = $5, injury_details = $6, treatment_provided = $7, 
            outcome = $8, is_riddor_reportable = $9, witness_details = $10, animal_involved = $11, 
            linked_animal_id = $12, modified_by = $13, updated_at = now()
           WHERE id = $14`,
          [...params, editIncident.id]
        );
      } else {
        await db.query(
          `INSERT INTO incidents (
            incident_date, person_involved_name, person_type, location, incident_description, 
            injury_details, treatment_provided, outcome, is_riddor_reportable, witness_details, 
            animal_involved, linked_animal_id, reported_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(editIncident ? 'Incident updated' : 'Incident logged');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      incident_date: editIncident ? new Date(editIncident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      person_involved_name: editIncident?.person_involved_name || '',
      person_type: editIncident?.person_type || 'STAFF',
      location: editIncident?.location || '',
      incident_description: editIncident?.incident_description || '',
      injury_details: editIncident?.injury_details || '',
      treatment_provided: editIncident?.treatment_provided || '',
      outcome: editIncident?.outcome || 'RETURNED_TO_NORMAL',
      is_riddor_reportable: editIncident?.is_riddor_reportable || false,
      witness_details: editIncident?.witness_details || '',
      animal_involved: editIncident?.animal_involved || false,
      linked_animal_id: editIncident?.linked_animal_id || ''
    } as IncidentFormValues,
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
            <HeartPulse size={20} className="text-rose-500" />
            {editIncident ? 'Edit First Aid Record' : 'Log First Aid Incident'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="incident-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <form.Field name="incident_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time</label>
                    <input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white" />
                  </div>
                )}
              </form.Field>
              <form.Field name="location">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Location</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="e.g. Cafe" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="person_involved_name">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Person Involved</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="Full Name" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" />
                  </div>
                )}
              </form.Field>
              <form.Field name="person_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Type</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'STAFF' | 'VISITOR' | 'CONTRACTOR' | 'VOLUNTEER')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="STAFF">Staff</option><option value="VISITOR">Visitor</option>
                      <option value="CONTRACTOR">Contractor</option><option value="VOLUNTEER">Volunteer</option>
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-4 pt-2">
              <form.Field name="incident_description">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Incident Description</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50" />
                  </div>
                )}
              </form.Field>
              <form.Field name="injury_details">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Injury Details</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50" />
                  </div>
                )}
              </form.Field>
              <form.Field name="treatment_provided">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Treatment Provided</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <form.Field name="outcome">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Outcome</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'RETURNED_TO_NORMAL' | 'WENT_HOME' | 'HOSPITAL' | 'FATAL')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="RETURNED_TO_NORMAL">Returned to normal</option>
                      <option value="WENT_HOME">Went Home</option>
                      <option value="HOSPITAL">Hospital</option>
                      <option value="FATAL">Fatal</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <div className="flex items-center gap-3 pt-5">
                <form.Field name="is_riddor_reportable">
                  {field => (
                    <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg w-full">
                      <input type="checkbox" id="riddor" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="w-4 h-4 text-rose-600 rounded border-rose-300" />
                      <label htmlFor="riddor" className="text-xs font-black text-rose-800 uppercase tracking-widest cursor-pointer">RIDDOR Reportable</label>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <form.Field name="animal_involved">
                {field => (
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="animal_involved" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="w-4 h-4 text-slate-800 rounded border-slate-300" />
                    <label htmlFor="animal_involved" className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer">Animal Involved</label>
                  </div>
                )}
              </form.Field>
              
              <form.Subscribe selector={(state) => state.values.animal_involved}>
                {(animalInvolved) => animalInvolved && (
                  <form.Field name="linked_animal_id">
                    {field => (
                      <select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 mt-1 focus:ring-2 focus:ring-rose-500">
                        <option value="">-- Select Animal --</option>
                        {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    )}
                  </form.Field>
                )}
              </form.Subscribe>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="incident-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncidentView() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState<Incident | null>(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT i.*, a.name as animal_name 
        FROM incidents i 
        LEFT JOIN animals a ON i.linked_animal_id = a.id 
        WHERE i.is_deleted = false 
        ORDER BY i.incident_date DESC
      `);
      return res.rows as Incident[];
    }
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE incidents SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident deleted');
    }
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-rose-500" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">First Aid Log</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Medical incidents involving staff or visitors.</p>
        </div>
        <button onClick={() => { setIncidentToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
          <Plus size={18} /> Log Incident
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Location</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Person Involved</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Outcome</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Flags</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map(i => (
              <tr key={i.id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800">{new Date(i.incident_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  <span className="text-[10px] font-black text-slate-400 uppercase"><MapPin size={10} className="inline mr-0.5"/> {i.location}</span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800 uppercase">{i.person_involved_name}</p>
                  <span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded-md border text-slate-600"><User size={10} className="inline mr-1"/>{i.person_type}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${i.outcome === 'HOSPITAL' || i.outcome === 'FATAL' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                    {i.outcome.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-1 items-center">
                    {i.is_riddor_reportable && <span title="RIDDOR Reportable" className="p-1.5 bg-red-100 border border-red-200 text-red-600 rounded-md"><AlertTriangle size={14}/></span>}
                    {i.animal_involved && <span title={`Animal Involved: ${i.animal_name || 'Unknown'}`} className="p-1.5 bg-orange-100 border border-orange-200 text-orange-600 rounded-md"><HeartPulse size={14}/></span>}
                    {!i.is_riddor_reportable && !i.animal_involved && <span className="text-slate-300 text-xs font-bold">-</span>}
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setIncidentToEdit(i); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white shadow-sm border border-slate-200 rounded-md mx-1"><Edit2 size={14} /></button>
                  <button onClick={() => { if(window.confirm('Delete incident log permanently?')) deleteIncident.mutate(i.id); }} className="p-1.5 text-slate-400 hover:text-red-600 bg-white shadow-sm border border-slate-200 rounded-md"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No incidents logged</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <IncidentModal 
          key={incidentToEdit ? incidentToEdit.id : 'new-incident'} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          animals={animals} 
          editIncident={incidentToEdit} 
        />
      )}
    </div>
  );
}