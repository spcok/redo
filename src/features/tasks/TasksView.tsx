import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { 
  Loader2, Plus, CheckCircle, Circle, User as UserIcon, 
  X, Save, ClipboardList, Wrench, Stethoscope, MapPin, 
  Edit2, Trash2, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  task_type: 'GENERAL' | 'MAINTENANCE' | 'MEDICAL' | 'HUSBANDRY';
  location: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'COMPLETED';
  assigned_initials?: string | null;
}

interface User {
  id: string;
  name: string;
  email?: string;
}

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  task_type: z.enum(['GENERAL', 'MAINTENANCE', 'MEDICAL', 'HUSBANDRY']),
  location: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  editTask: Task | null;
}

function TaskModal({ isOpen, onClose, users, editTask }: TaskModalProps) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: TaskFormValues) => {
      await db.waitReady;
      
      const params = [
        val.title,
        val.description || null,
        val.assigned_to || null,
        val.due_date || null,
        val.task_type,
        val.location || null,
        val.priority,
        currentUserId
      ];

      if (editTask) {
        await db.query(
          `UPDATE tasks SET 
            title = $1, description = $2, assigned_to = $3, due_date = $4, 
            task_type = $5, location = $6, priority = $7, modified_by = $8, updated_at = now()
           WHERE id = $9`,
          [...params, editTask.id]
        );
      } else {
        await db.query(
          `INSERT INTO tasks (
            title, description, assigned_to, due_date, task_type, location, priority, status, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $8)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(editTask ? 'Task updated' : 'Task created');
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      title: editTask?.title || '',
      description: editTask?.description || '',
      assigned_to: editTask?.assigned_to || '',
      due_date: editTask?.due_date ? editTask.due_date.substring(0, 10) : '',
      task_type: editTask?.task_type || 'GENERAL',
      location: editTask?.location || '',
      priority: editTask?.priority || 'MEDIUM'
    } as TaskFormValues,
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-500" />
            {editTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="task-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <form.Field name="title" validators={{ onChange: taskSchema.shape.title }}>
              {(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Title</label>
                  <input value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Clean enclosure..." />
                  {field.state.meta.errors && <p className="text-[10px] text-rose-500 mt-1 font-bold">{field.state.meta.errors.join(', ')}</p>}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="task_type">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</label>
                    <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value as 'GENERAL' | 'MAINTENANCE' | 'MEDICAL' | 'HUSBANDRY')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500">
                      <option value="GENERAL">General</option>
                      <option value="HUSBANDRY">Husbandry</option>
                      <option value="MEDICAL">Medical</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Field name="priority">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Priority</label>
                    <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500">
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
              <form.Field name="due_date">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</label>
                    <input type="date" value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </form.Field>

              <form.Field name="assigned_to">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assign To</label>
                    <select value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500">
                      <option value="">-- Unassigned --</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="location">
              {(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Location</label>
                  <input value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Aviary 3" />
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes</label>
                  <textarea value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 min-h-[80px]" placeholder="Additional details..." />
                </div>
              )}
            </form.Field>

          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
          <button form="task-form" type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

export function TasksView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name FROM users WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as User[];
    }
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      await db.waitReady;
      let query = `
        SELECT t.*, u.name as assigned_initials 
        FROM tasks t 
        LEFT JOIN users u ON t.assigned_to = u.id 
        WHERE t.is_deleted = false
      `;
      if (filter !== 'ALL') query += ` AND t.status = '${filter}'`;
      query += ` ORDER BY CASE WHEN t.status = 'PENDING' THEN 0 ELSE 1 END, t.due_date ASC NULLS LAST, t.created_at DESC`;
      
      const res = await db.query(query);
      return res.rows as Task[];
    }
  });

  const toggleTask = useMutation({
    mutationFn: async (task: Task) => {
      await db.waitReady;
      const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await db.query(
        `UPDATE tasks SET status = $1, modified_by = $2, updated_at = now() WHERE id = $3`,
        [newStatus, currentUserId, task.id]
      );
    },
    onMutate: async (t) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['tasks', filter], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(task => task.id === t.id ? { ...task, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : task);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] }); 
    }
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE tasks SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    }
  });

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'MAINTENANCE': return <Wrench size={12} className="inline mr-1" />;
      case 'MEDICAL': return <Stethoscope size={12} className="inline mr-1" />;
      case 'HUSBANDRY': return <ClipboardList size={12} className="inline mr-1" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENT': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Task Manager</h1>
          <p className="text-slate-500 font-bold text-sm mt-1">Facility duties and husbandry assignments.</p>
        </div>
        <button 
          onClick={() => { setTaskToEdit(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus size={18} /> Add Task
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-2">
          {['PENDING', 'COMPLETED', 'ALL'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f as 'ALL' | 'PENDING' | 'COMPLETED')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50">
              <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400 opacity-50" />
              <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">All Clear</h3>
              <p className="text-sm font-bold text-slate-400 mt-1">No tasks found for this filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="w-12 px-4 py-3 text-center"></th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Task Details</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Due</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(t => (
                  <tr key={t.id} className={`group transition-colors hover:bg-slate-50/50 ${t.status === 'COMPLETED' ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => toggleTask.mutate(t)}
                        className={`transition-colors ${t.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                      >
                        {t.status === 'COMPLETED' ? <CheckCircle size={24} /> : <Circle size={24} />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className={`font-black text-sm uppercase tracking-tight ${t.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-800'}`}>{t.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t.location && <span><MapPin size={10} className="inline mr-0.5"/> {t.location}</span>}
                        {t.description && <span className="truncate max-w-[200px]" title={t.description}>📝 {t.description}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {t.due_date ? (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                          <Calendar size={12}/> {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm w-fit flex items-center">
                        {getTypeIcon(t.task_type)} {t.task_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest border px-2 py-1 rounded ${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1">
                        <UserIcon size={12} className="text-slate-400" /> 
                        {t.assigned_initials || 'Any'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button onClick={() => { setTaskToEdit(t); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => { if(window.confirm('Delete this task?')) deleteTask.mutate(t.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <TaskModal 
          key={taskToEdit ? taskToEdit.id : 'new-task'} 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }} 
          users={users} 
          editTask={taskToEdit} 
        />
      )}

    </div>
  );
}