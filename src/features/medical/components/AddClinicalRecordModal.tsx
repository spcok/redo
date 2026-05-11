import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, X, Save, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnimalOption {
  id: string;
  name: string;
}

const recordSchema = z.object({
  animal_id: z.string().min(1, "Patient required"),
  record_type: z.enum(['GENERAL_EXAM', 'SURGERY', 'DENTAL', 'VACCINATION', 'OTHER']),
  record_date: z.string().min(1, "Date required"),
  soap_subjective: z.string().default(''),
  soap_objective: z.string().default(''),
  soap_assessment: z.string().default(''),
  soap_plan: z.string().default(''),
  diagnosis: z.string().nullable().optional(),
  weight_grams: z.number().nullable().optional(),
  conductor_role: z.string().min(1, "Role required"),
  external_vet_name: z.string().default(''),
  external_vet_clinic: z.string().default(''),
});

type RecordFormValues = z.infer<typeof recordSchema>;

export function AddClinicalRecordModal({ isOpen, onClose, animalId }: { isOpen: boolean, onClose: () => void, animalId?: string }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (val: RecordFormValues) => {
      await db.waitReady;
      await db.query(
        `INSERT INTO clinical_records (
          animal_id, record_type, record_date, soap_subjective, soap_objective, 
          soap_assessment, soap_plan, diagnosis, weight_grams, conductor_role, 
          conducted_by, external_vet_name, external_vet_clinic, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)`,
        [
          val.animal_id, val.record_type, val.record_date, val.soap_subjective, val.soap_objective,
          val.soap_assessment, val.soap_plan, val.diagnosis || null, val.weight_grams || null, 
          val.conductor_role, currentUserId, val.external_vet_name, val.external_vet_clinic, currentUserId
        ]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_clinical_records'] });
      toast.success('Clinical record created');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      animal_id: animalId || '',
      record_type: 'GENERAL_EXAM',
      record_date: new Date().toISOString().slice(0, 16),
      soap_subjective: '',
      soap_objective: '',
      soap_assessment: '',
      soap_plan: '',
      diagnosis: '',
      weight_grams: undefined,
      conductor_role: 'VET',
      external_vet_name: '',
      external_vet_clinic: ''
    } as RecordFormValues,
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
            <Stethoscope size={20} className="text-indigo-500" /> New Clinical Record
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="record-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              {!animalId && (
                <form.Field name="animal_id">
                  {field => (
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-indigo-600 uppercase">Patient *</label>
                      <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Select Patient --</option>
                        {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                  )}
                </form.Field>
              )}
              <form.Field name="record_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Encounter Type *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500">
                      <option value="GENERAL_EXAM">General Exam</option>
                      <option value="SURGERY">Surgery</option>
                      <option value="DENTAL">Dental</option>
                      <option value="VACCINATION">Vaccination</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="record_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time *</label>
                    <input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-3">
               <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-1">SOAP Notes</h3>
               <div className="grid grid-cols-2 gap-4">
                  <form.Field name="soap_subjective">
                    {field => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Subjective</label>
                        <textarea placeholder="History, observations..." value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="soap_objective">
                    {field => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Objective</label>
                        <textarea placeholder="Exam findings, vitals..." value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="soap_assessment">
                    {field => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Assessment</label>
                        <textarea placeholder="Diagnosis, differentials..." value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="soap_plan">
                    {field => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Plan</label>
                        <textarea placeholder="Treatments, prescriptions..." value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full h-20 px-3 py-2 border rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    )}
                  </form.Field>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <form.Field name="diagnosis">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Primary Diagnosis</label>
                    <input value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
              <form.Field name="weight_grams">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Weight (grams)</label>
                    <input type="number" value={field.state.value || ''} onChange={e => field.handleChange(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <form.Field name="conductor_role">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Conductor Role *</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500">
                      <option value="VET">Veterinarian</option>
                      <option value="NURSE">Vet Nurse</option>
                      <option value="KEEPER">Keeper</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="external_vet_name">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">External Vet Name</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
              <form.Field name="external_vet_clinic">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">External Clinic</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="record-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
          </button>
        </div>
      </div>
    </div>
  );
}