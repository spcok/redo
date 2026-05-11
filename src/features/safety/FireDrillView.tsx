import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Flame, Edit2, Trash2, Timer, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FireDrillLog {
  id: string;
  drill_date: string;
  drill_type: 'PLANNED' | 'UNPLANNED' | 'FALSE_ALARM';
  areas_involved: string;
  evacuation_duration: string;
  roll_call_completed: boolean;
  issues_observed: string | null;
  corrective_actions: string | null;
  status: 'PASS' | 'REQUIRES_ACTION' | 'RESOLVED';
  conducted_by: string | null;
  conductor_name?: string | null;
}

interface UserOption {
  id: string;
  name: string;
}

const drillSchema = z.object({
  drill_date: z.string().min(1, "Date required"),
  drill_type: z.enum(['PLANNED', 'UNPLANNED', 'FALSE_ALARM']),
  areas_involved: z.string().min(1, "Areas involved required"),
  evacuation_duration: z.string().regex(/^\d{2}:\d{2}$/, "Must be MM:SS format"),
  roll_call_completed: z.boolean(),
  issues_observed: z.string().nullable().optional(),
  corrective_actions: z.string().nullable().optional(),
  status: z.enum(['PASS', 'REQUIRES_ACTION', 'RESOLVED']),
  conducted_by: z.string().nullable().optional(),
});

type DrillFormValues = z.infer<typeof drillSchema>;

function DrillModal({ isOpen, onClose, users, editDrill }: { isOpen: boolean, onClose: () => void, users: UserOption[], editDrill: FireDrillLog | null }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: DrillFormValues) => {
      await db.waitReady;
      
      const params = [
        val.drill_date, val.drill_type, val.areas_involved, val.evacuation_duration,
        val.roll_call_completed, val.issues_observed || null, val.corrective_actions || null,
        val.status, val.conducted_by || null, currentUserId
      ];

      if (editDrill) {
        await db.query(
          `UPDATE fire_drill_logs SET 
            drill_date=$1, drill_type=$2, areas_involved=$3, evacuation_duration=$4,
            roll_call_completed=$5, issues_observed=$6, corrective_actions=$7, 
            status=$8, conducted_by=$9, modified_by=$10, updated_at=now()
           WHERE id = $11`,
          [...params, editDrill.id]
        );
      } else {
        await db.query(
          `INSERT INTO fire_drill_logs (
            drill_date, drill_type, areas_involved, evacuation_duration, roll_call_completed, 
            issues_observed, corrective_actions, status, conducted_by, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire-drills'] });
      toast.success(editDrill ? 'Drill updated' : 'Drill logged');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      drill_date: editDrill ? new Date(editDrill.drill_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      drill_type: editDrill?.drill_type || 'PLANNED',
      areas_involved: editDrill?.areas_involved || 'WHOLE SITE',
      evacuation_duration: editDrill?.evacuation_duration || '00:00',
      roll_call_completed: editDrill?.roll_call_completed || false,
      issues_observed: editDrill?.issues_observed || '',
      corrective_actions: editDrill?.corrective_actions || '',
      status: editDrill?.status || 'PASS',
      conducted_by: editDrill?.conducted_by || ''
    } as DrillFormValues,
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
            <Flame size={20} className="text-rose-500" />
            {editDrill ? 'Edit Drill Record' : 'Log Fire Drill'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="drill-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <form.Field name="drill_date">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Date & Time</label>
                    <input type="datetime-local" value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-rose-500" />
                  </div>
                )}
              </form.Field>
              <form.Field name="drill_type">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Drill Type</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'PLANNED' | 'UNPLANNED' | 'FALSE_ALARM')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-white focus:ring-2 focus:ring-rose-500">
                      <option value="PLANNED">Planned Drill</option>
                      <option value="UNPLANNED">Unplanned Drill</option>
                      <option value="FALSE_ALARM">False Alarm</option>
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="areas_involved">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Areas Involved</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="e.g. WHOLE SITE" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500" />
                  </div>
                )}
              </form.Field>
              <form.Field name="evacuation_duration" validators={{ onChange: drillSchema.shape.evacuation_duration }}>
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><Timer size={10}/> Evacuation Time</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="MM:SS" className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-rose-500" />
                    {field.state.meta.errors && <p className="text-[10px] text-rose-500 mt-1 font-bold">{field.state.meta.errors.join(', ')}</p>}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="roll_call_completed">
              {field => (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input type="checkbox" id="roll-call" checked={field.state.value} onChange={e => field.handleChange(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
                  <label htmlFor="roll-call" className="text-sm font-bold text-slate-700 select-none">Full Staff & Visitor Roll Call Completed Successfully</label>
                </div>
              )}
            </form.Field>

            <div className="space-y-4 pt-2">
              <form.Field name="issues_observed">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Issues Observed</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50 focus:ring-2 focus:ring-rose-500" placeholder="Were any exits blocked? Did alarms sound correctly?" />
                  </div>
                )}
              </form.Field>
              <form.Field name="corrective_actions">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Corrective Actions Required</label>
                    <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[60px] bg-slate-50 focus:ring-2 focus:ring-rose-500" placeholder="What needs fixing before the next drill?" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <form.Field name="status">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Drill Status</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'PASS' | 'REQUIRES_ACTION' | 'RESOLVED')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="PASS">Pass</option>
                      <option value="REQUIRES_ACTION">Requires Action</option>
                      <option value="RESOLVED">Issues Resolved</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="conducted_by">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Conducted By</label>
                    <select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50">
                      <option value="">Select...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>
          </form>
        </div>

        <div className="p-6 border-t flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 border rounded-xl text-xs font-bold uppercase hover:bg-slate-50 transition-colors">Cancel</button>
          <button form="drill-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-slate-800 transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null} Save Drill
          </button>
        </div>
      </div>
    </div>
  );
}

export function FireDrillView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [filter, setFilter] = useState<'PASS' | 'REQUIRES_ACTION' | 'RESOLVED' | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [drillToEdit, setDrillToEdit] = useState<FireDrillLog | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM users WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as UserOption[];
    }
  });

  const { data: drills = [], isLoading } = useQuery({
    queryKey: ['fire-drills', filter],
    queryFn: async () => {
      await db.waitReady;
      let query = `
        SELECT f.*, u.name as conductor_name 
        FROM fire_drill_logs f 
        LEFT JOIN users u ON f.conducted_by = u.id 
        WHERE f.is_deleted = false
      `;
      if (filter !== 'ALL') query += ` AND f.status = '${filter}'`;
      query += ` ORDER BY f.drill_date DESC`;
      
      const res = await db.query(query);
      return res.rows as FireDrillLog[];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await db.waitReady;
      await db.query(`UPDATE fire_drill_logs SET status = $1, modified_by = $2, updated_at = now() WHERE id = $3`, [newStatus, currentUserId, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fire-drills'] })
  });

  const deleteDrill = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE fire_drill_logs SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fire-drills'] });
      toast.success('Drill record deleted');
    }
  });

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-rose-500" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Fire & Evacuations</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Log mandatory fire drills and false alarms.</p>
        </div>
        <button onClick={() => { setDrillToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
          <Plus size={18} /> Log Drill
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
          {['ALL', 'PASS', 'REQUIRES_ACTION', 'RESOLVED'].map(f => (
            <button key={f} onClick={() => setFilter(f as 'PASS' | 'REQUIRES_ACTION' | 'RESOLVED' | 'ALL')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Type</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Evac Time</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Areas</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drills.map(d => (
              <tr key={d.id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800">{new Date(d.drill_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{d.drill_type.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-slate-100 text-slate-700 px-2 py-1 rounded-md border tracking-wider"><Timer size={12} className="inline mr-1"/>{d.evacuation_duration}</span>
                    {d.roll_call_completed ? (
                      <CheckCircle size={16} className="text-emerald-500" title="Roll Call Complete" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500" title="Roll Call Incomplete" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-xs font-bold text-slate-600">{d.areas_involved}</span></td>
                <td className="px-4 py-3">
                    <select value={d.status} onChange={(e) => updateStatus.mutate({ id: d.id, newStatus: e.target.value })} className="text-xs font-bold bg-slate-50 border rounded-lg px-2 py-1 focus:outline-none focus:border-rose-500">
                        <option value="PASS">Pass</option><option value="REQUIRES_ACTION">Requires Action</option><option value="RESOLVED">Issues Resolved</option>
                    </select>
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setDrillToEdit(d); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(window.confirm('Delete this record?')) deleteDrill.mutate(d.id); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {drills.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No drill records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <DrillModal 
          key={drillToEdit ? drillToEdit.id : 'new-drill'} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          users={users}
          editDrill={drillToEdit} 
        />
      )}
    </div>
  );
}