import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { Loader2, Plus, X, Save, MapPin, Edit2, Trash2, Wrench, Monitor, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface MaintenanceTicket {
  id: string;
  title: string;
  description: string | null;
  category: 'SITE' | 'IT' | 'EQUIPMENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  location: string;
  equipment_tag: string | null;
  assigned_to: string | null;
  reported_by: string | null;
  assigned_name?: string | null;
}

interface UserOption {
  id: string;
  name: string;
}

const maintenanceSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().nullable().optional(),
  category: z.enum(['SITE', 'IT', 'EQUIPMENT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  location: z.string().min(1, "Location required"),
  equipment_tag: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

function MaintenanceModal({ isOpen, onClose, users, editTicket }: { isOpen: boolean, onClose: () => void, users: UserOption[], editTicket: MaintenanceTicket | null }) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: MaintenanceFormValues) => {
      await db.waitReady;
      
      const params = [
        val.title,
        val.description || null,
        val.category,
        val.priority,
        val.location,
        val.equipment_tag || null,
        val.assigned_to || null,
        currentUserId
      ];

      if (editTicket) {
        await db.query(
          `UPDATE maintenance_tickets SET 
            title = $1, description = $2, category = $3, priority = $4, 
            location = $5, equipment_tag = $6, assigned_to = $7, modified_by = $8, updated_at = now()
           WHERE id = $9`,
          [...params, editTicket.id]
        );
      } else {
        await db.query(
          `INSERT INTO maintenance_tickets (
            title, description, category, priority, location, equipment_tag, assigned_to, reported_by, status, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', $8)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      toast.success(editTicket ? 'Ticket updated' : 'Ticket logged');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: { 
      title: editTicket?.title || '', 
      description: editTicket?.description || '', 
      category: editTicket?.category || 'SITE', 
      priority: editTicket?.priority || 'MEDIUM', 
      location: editTicket?.location || '', 
      equipment_tag: editTicket?.equipment_tag || '', 
      assigned_to: editTicket?.assigned_to || '' 
    } as MaintenanceFormValues,
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
            <Wrench size={20} className="text-blue-500" />
            {editTicket ? 'Edit Ticket' : 'Log Maintenance'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="ticket-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
            <form.Field name="title">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Issue Title</label>
                  <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 bg-slate-50" placeholder="e.g. Broken Lock on Aviary 4" />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="category">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Category</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'SITE' | 'IT' | 'EQUIPMENT')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500">
                      <option value="SITE">Site / Enclosure</option>
                      <option value="IT">IT / Systems</option>
                      <option value="EQUIPMENT">Equipment</option>
                    </select>
                  </div>
                )}
              </form.Field>
              <form.Field name="priority">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Priority</label>
                    <select value={field.state.value} onChange={e => field.handleChange(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="location">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Location</label>
                    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500" placeholder="e.g. Section B" />
                  </div>
                )}
              </form.Field>
              <form.Field name="assigned_to">
                {field => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Assign To</label>
                    <select value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500">
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="equipment_tag">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Equipment Tag (Optional)</label>
                  <input value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-slate-50 focus:ring-2 focus:ring-blue-500" placeholder="e.g. EQ-1042" />
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {field => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Description</label>
                  <textarea value={field.state.value || ''} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-bold min-h-[80px] bg-slate-50 focus:ring-2 focus:ring-blue-500" placeholder="Details of the fault..." />
                </div>
              )}
            </form.Field>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="ticket-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

export function MaintenanceView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [filter, setFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL'>('OPEN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<MaintenanceTicket | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM users WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as UserOption[];
    }
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['maintenance-tickets', filter],
    queryFn: async () => {
      await db.waitReady;
      let query = `
        SELECT t.*, u.name as assigned_name 
        FROM maintenance_tickets t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.is_deleted = false
      `;
      if (filter !== 'ALL') query += ` AND t.status = '${filter}'`;
      query += ` ORDER BY CASE WHEN t.priority = 'URGENT' THEN 1 WHEN t.priority = 'HIGH' THEN 2 WHEN t.priority = 'MEDIUM' THEN 3 ELSE 4 END ASC, t.created_at DESC`;
      
      const res = await db.query(query);
      return res.rows as MaintenanceTicket[];
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string, newStatus: string }) => {
      await db.waitReady;
      await db.query(`UPDATE maintenance_tickets SET status = $1, modified_by = $2, updated_at = now() WHERE id = $3`, [newStatus, currentUserId, id]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] })
  });

  const deleteTicket = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE maintenance_tickets SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tickets'] });
      toast.success('Ticket deleted');
    }
  });

  const getCatIcon = (cat: string) => {
    switch(cat) {
      case 'IT': return <Monitor size={14} className="inline mr-1 text-indigo-500" />;
      case 'EQUIPMENT': return <Settings size={14} className="inline mr-1 text-slate-500" />;
      default: return <Wrench size={14} className="inline mr-1 text-blue-500" />;
    }
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Maintenance</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Report and track facility faults.</p>
        </div>
        <button onClick={() => { setTicketToEdit(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg">
          <Plus size={18} /> Log Ticket
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
          {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map(f => (
            <button key={f} onClick={() => setFilter(f as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ALL')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Details</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map(t => (
              <tr key={t.id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-bold text-sm text-slate-800 uppercase">{t.title}</p>
                  <span className="text-[10px] font-black text-slate-400 uppercase"><MapPin size={10} className="inline mr-0.5"/> {t.location}</span>
                  {t.assigned_name && <span className="ml-3 text-[10px] font-black text-indigo-500 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">👤 {t.assigned_name}</span>}
                </td>
                <td className="px-4 py-3"><span className="text-[10px] font-black uppercase bg-slate-100 px-2 py-1 rounded-md border">{getCatIcon(t.category)} {t.category}</span></td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-black uppercase border px-2 py-1 rounded-md ${t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700 border-rose-200' : t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-600'}`}>
                    {t.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                    <select value={t.status} onChange={(e) => updateStatus.mutate({ id: t.id, newStatus: e.target.value })} className="text-xs font-bold bg-slate-50 border rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500">
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                    </select>
                </td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setTicketToEdit(t); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white shadow-sm border border-slate-200 rounded-md mx-1"><Edit2 size={14} /></button>
                  <button onClick={() => { if(window.confirm('Delete Ticket permanently?')) deleteTicket.mutate(t.id); }} className="p-1.5 text-slate-400 hover:text-red-600 bg-white shadow-sm border border-slate-200 rounded-md"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm uppercase tracking-widest">No tickets found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <MaintenanceModal 
          key={ticketToEdit ? ticketToEdit.id : 'new'} 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          users={users} 
          editTicket={ticketToEdit} 
        />
      )}
    </div>
  );
}