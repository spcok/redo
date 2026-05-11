import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, AlertTriangle, Edit2, Trash2, Siren, User, HeartPulse, HardHat } from 'lucide-react';
import toast from 'react-hot-toast';

interface SafetyIncident {
  id: string;
  incident_date: string;
  title: string;
  incident_type: 'ANIMAL_ESCAPE' | 'FIRE' | 'NEAR_MISS' | 'SECURITY_BREACH' | 'INFRASTRUCTURE_FAILURE' | 'SEVERE_WEATHER' | 'OTHER';
  severity_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  description: string | null;
  immediate_action_taken: string | null;
  animal_involved: boolean;
  linked_animal_id: string | null;
  first_aid_required: boolean;
  root_cause: string | null;
  preventative_action: string | null;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED';
}

interface AnimalOption {
  id: string;
  name: string;
}

const safetySchema = z.object({
  incident_date: z.string().min(1, "Date required"),
  title: z.string().min(1, "Title required"),
  incident_type: z.enum(['ANIMAL_ESCAPE', 'FIRE', 'NEAR_MISS', 'SECURITY_BREACH', 'INFRASTRUCTURE_FAILURE', 'SEVERE_WEATHER', 'OTHER']),
  severity_level: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  location: z.string().min(1, "Location required"),
  description: z.string().nullable().optional(),
  immediate_action_taken: z.string().nullable().optional(),
  animal_involved: z.boolean(),
  linked_animal_id: z.string().nullable().optional(),
  first_aid_required: z.boolean(),
  root_cause: z.string().nullable().optional(),
  preventative_action: z.string().nullable().optional(),
});

type SafetyFormValues = z.infer<typeof safetySchema>;

function SafetyModal({ isOpen, onClose, animals, editIncident }: { isOpen: boolean, onClose: () => void, animals: AnimalOption[], editIncident: SafetyIncident | null }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: SafetyFormValues) => {
      await db.waitReady;
      
      const params = [
        val.incident_date, val.title, val.incident_type, val.severity_level, val.location,
        val.description || null, val.immediate_action_taken || null, val.animal_involved,
        val.animal_involved && val.linked_animal_id ? val.linked_animal_id : null, 
        val.first_aid_required, val.root_cause || null, val.preventative_action || null, 
        currentUserId
      ];

      if (editIncident) {
        await db.query(
          `UPDATE safety_incidents SET 
            incident_date=$1, title=$2, incident_type=$3, severity_level=$4, location=$5,
            description=$6, immediate_action_taken=$7, animal_involved=$8, linked_animal_id=$9,
            first_aid_required=$10, root_cause=$11, preventative_action=$12, modified_by=$13, updated_at=now()
           WHERE id = $14`,
          [...params, editIncident.id]
        );
      } else {
        await db.query(
          `INSERT INTO safety_incidents (
            incident_date, title, incident_type, severity_level, location, description, 
            immediate_action_taken, animal_involved, linked_animal_id, first_aid_required, 
            root_cause, preventative_action, reported_by, modified_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, 'OPEN')`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      toast.success(editIncident ? 'Incident updated' : 'Incident reported');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      incident_date: editIncident ? new Date(editIncident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      title: editIncident?.title || '',
      incident_type: editIncident?.incident_type || 'NEAR_MISS',
      severity_level: editIncident?.severity_level || 'LOW',
      location: editIncident?.location || '',
      description: editIncident?.description || '',
      immediate_action_taken: editIncident?.immediate_action_taken || '',
      animal_involved: editIncident?.animal_involved || false,
      linked_animal_id: editIncident?.linked_animal_id || '',
      first_aid_required: editIncident?.first_aid_required || false,
      root_cause: editIncident?.root_cause || '',
      preventative_action: editIncident?.preventative_action || ''
    } as SafetyFormValues,
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
            <Siren size={20} className="text-orange-500" />
            {editIncident ? 'Edit Safety Incident' : 'Report Safety Incident'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="safety-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
              <form.Field name="title">
                {field => (
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Brief Title</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-orange-500" placeholder="e.g. Visitor Slipped on Path" />
                  </div>
                )}
              </form.Field>
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
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="Specific area" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="incident_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Category</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'ANIMAL_ESCAPE' | 'FIRE' | 'NEAR_MISS' | 'SECURITY_BREACH' | 'INFRASTRUCTURE_FAILURE' | 'SEVERE_WEATHER' | 'OTHER')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="NEAR_MISS">Near Miss</option><option value="ANIMAL_ESCAPE">Animal Escape</option>
                      <option value="FIRE">Fire / Smoke</option><option value="SECURITY_BREACH">Security Breach</option>
                      <option value="INFRASTRUCTURE_FAILURE">Infrastructure Failure</option>
                      <option value="SEVERE_WEATHER">Severe Weather</option><option value="OTHER">Other</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="severity_level">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Severity</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="description">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">What Happened?</label>
                  <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[80px] bg-slate-50" />
                </div>
              )}
            </form.Field>

            <form.Field name="immediate_action_taken">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Immediate Action Taken</label>
                  <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50" />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <form.Field name="animal_involved">
                {field => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="animal" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="w-4 h-4 text-orange-600 rounded" />
                    <label htmlFor="animal" className="text-xs font-black text-slate-600 uppercase">Animal Involved</label>
                  </div>
                )}
              </form.Field>
              <form.Field name="first_aid_required">
                {field => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="firstaid" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="w-4 h-4 text-rose-600 rounded" />
                    <label htmlFor="firstaid" className="text-xs font-black text-slate-600 uppercase">First Aid Required</label>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Subscribe selector={(state) => state.values.animal_involved}>
              {(animalInvolved) => animalInvolved && (
                <form.Field name="linked_animal_id">
                  {field => (
                    <select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="">-- Select Animal --</option>
                      {animals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  )}
                </form.Field>
              )}
            </form.Subscribe>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <form.Field name="root_cause">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Identified Root Cause</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" />
                  </div>
                )}
              </form.Field>
              <form.Field name="preventative_action">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Preventative Action</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50" />
                  </div>
                )}
              </form.Field>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="safety-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

export function SafetyIncidentView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [filter, setFilter] = useState<'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED' | 'ALL'>('OPEN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidentToEdit, setIncidentToEdit] = useState<SafetyIncident | null>(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['safety-incidents', filter],
    queryFn: async () => {
      await db.waitReady;
      let query = `SELECT * FROM safety_incidents WHERE is_deleted = false`;
      if (filter !== 'ALL') query += ` AND status = '${filter}'`;
      query += ` ORDER BY CASE WHEN severity_level = 'CRITICAL' THEN 1 WHEN severity_level = 'HIGH' THEN 2 WHEN severity_level = 'MEDIUM' THEN 3 ELSE 4 END ASC, incident_date DESC`;
      
      const res = await db.query(query);
      return res.rows as SafetyIncident[];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await db.waitReady;
      await db.query(`UPDATE safety_incidents SET status = $1, modified_by = $2, updated_at = now() WHERE id = $3`, [newStatus, currentUserId, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-incidents'] })
  });

  const deleteIncident = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE safety_incidents SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety-incidents'] });
      toast.success('Incident deleted');
    }
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-orange-500" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Safety & Hazards</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Report and track operational safety events.</p>
        </div>
        <button onClick={() => { setIncidentToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20">
          <Plus size={18} /> Log Incident
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
          {['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'CLOSED', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f as 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED' | 'ALL')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Title</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Severity</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incidents.map(i => (
              <tr key={i.id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800">{new Date(i.incident_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{i.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${i.severity_level === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border-rose-200' : i.severity_level === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                    {i.severity_level}
                  </span>
                </td>
                <td className="px-4 py-3"><span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{i.incident_type.replace(/_/g, ' ')}</span></td>
                <td className="px-4 py-3">
                    <select value={i.status} onChange={(e) => updateStatus.mutate({ id: i.id, newStatus: e.target.value })} className="text-xs font-bold bg-slate-50 border rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500">
                        <option value="OPEN">Open</option><option value="UNDER_INVESTIGATION">Investigating</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
                    </select>
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setIncidentToEdit(i); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete this record?')) deleteIncident.mutate(i.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <SafetyModal 
          key={incidentToEdit ? incidentToEdit.id : 'new-safety'} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          animals={animals}
          editIncident={incidentToEdit} 
        />
      )}
    </div>
  );
}