import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { 
  Utensils, Calendar, ChevronLeft, ChevronRight, CheckCircle2, 
  Trash2, Loader2, Plus, ShieldAlert, History, Edit2, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Owl', 'Raptor', 'Mammal', 'Exotic', 'Other'];

// ==========================================
// STRICT TYPES & ZOD SCHEMAS (Law 3 & 4)
// ==========================================
interface FeedingSchedule {
  id: string;
  animal_id: string;
  food_type: string;
  quantity_grams: number | null;
  calci_dust: boolean;
  notes: string | null;
  interval_days: number;
  next_feed_date: string;
  is_completed: boolean;
  animal_name?: string;
  animal_species?: string;
  animal_category?: string;
}

interface AnimalOption {
  id: string;
  name: string;
  species: string | null;
  entity_type: string | null;
}

const scheduleSchema = z.object({
  animal_id: z.string().min(1, "Animal selection is required"),
  food_type: z.string().min(1, "Food type is required"),
  quantity_grams: z.number().nullable().optional(),
  calci_dust: z.boolean(),
  notes: z.string().nullable().optional(),
  interval_days: z.number().min(0, "Interval cannot be negative"),
  next_feed_date: z.string().min(1, "Starting date required")
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

// ==========================================
// COMPONENT: Left-Hand Form Panel
// ==========================================
interface SchedulePanelProps {
  animals: AnimalOption[];
  editSchedule: FeedingSchedule | null;
  onCancelEdit: () => void;
  targetDate: string;
}

function SchedulePanel({ animals, editSchedule, onCancelEdit, targetDate }: SchedulePanelProps) {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
  
  const [mode, setMode] = useState<'single' | 'interval'>(editSchedule && editSchedule.interval_days > 1 ? 'interval' : 'single');

  const saveMutation = useMutation({
    mutationFn: async (val: ScheduleFormValues) => {
      await db.waitReady;
      
      const params = [
        val.animal_id,
        val.food_type,
        val.quantity_grams || null, // Null Law
        val.calci_dust,
        val.notes || null, // Null Law
        mode === 'single' ? 1 : val.interval_days,
        val.next_feed_date,
        currentUserId
      ];

      if (editSchedule) {
        await db.query(
          `UPDATE feeding_schedules SET 
            animal_id = $1, food_type = $2, quantity_grams = $3, calci_dust = $4, 
            notes = $5, interval_days = $6, next_feed_date = $7, modified_by = $8, updated_at = now()
           WHERE id = $9`,
          [...params, editSchedule.id]
        );
      } else {
        await db.query(
          `INSERT INTO feeding_schedules (
            animal_id, food_type, quantity_grams, calci_dust, notes, interval_days, next_feed_date, created_by, modified_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
          params
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedules'] });
      toast.success(editSchedule ? 'Schedule updated' : 'Schedule added');
      onCancelEdit();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      animal_id: editSchedule?.animal_id || '',
      food_type: editSchedule?.food_type || '',
      quantity_grams: editSchedule?.quantity_grams || undefined,
      calci_dust: editSchedule?.calci_dust || false,
      notes: editSchedule?.notes || '',
      interval_days: editSchedule?.interval_days || 1,
      next_feed_date: editSchedule?.next_feed_date ? editSchedule.next_feed_date.substring(0, 10) : targetDate
    } as ScheduleFormValues,
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value);
      if (!editSchedule) {
        form.reset();
      }
    }
  });

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-colors ${editSchedule ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
          {editSchedule ? <Edit2 className="text-amber-500" size={18}/> : <Plus className="text-emerald-500" size={18}/>} 
          {editSchedule ? 'Edit Feed' : 'Plan Feed'}
        </h2>
        {editSchedule && <button onClick={onCancelEdit} className="text-slate-400 hover:text-rose-500"><X size={18}/></button>}
      </div>
      
      <form id="schedule-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
        <form.Field name="animal_id">
          {(field) => (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Select Animal</label>
              <select value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500">
                <option value="">-- Choose Animal --</option>
                {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.entity_type || a.species})</option>)}
              </select>
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="food_type" validators={{ onChange: scheduleSchema.shape.food_type }}>
            {(field) => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Food Type</label>
                <input type="text" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="e.g. Mice" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
              </div>
            )}
          </form.Field>

          <form.Field name="quantity_grams">
            {(field) => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Quantity (g)</label>
                <input type="number" value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : null)} placeholder="Amount" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500" />
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name="calci_dust">
          {(field) => (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <input type="checkbox" id="calci-dust" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-amber-500 focus:ring-amber-500" />
              <label htmlFor="calci-dust" className="text-sm font-bold text-slate-700 select-none">Apply Calci-Dust / Supplement</label>
            </div>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes (Optional)</label>
              <textarea value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value === '' ? null : e.target.value)} placeholder="Preparation instructions..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 min-h-[60px]" />
            </div>
          )}
        </form.Field>

        <div className="border-t border-slate-100 pt-4">
          {!editSchedule && (
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button type="button" onClick={() => setMode('single')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'single' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Single Day</button>
              <button type="button" onClick={() => setMode('interval')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === 'interval' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Interval Plan</button>
            </div>
          )}

          {mode === 'interval' && (
            <form.Field name="interval_days">
              {(field) => (
                <div className="mb-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                  <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Repeat Every (Days)</label>
                  <input type="number" min="1" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-amber-900 focus:outline-none" />
                </div>
              )}
            </form.Field>
          )}

          <button 
            type="submit" 
            disabled={saveMutation.isPending}
            className={`w-full py-3 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${editSchedule ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : editSchedule ? <Edit2 size={16}/> : <Plus size={16}/>}
            {editSchedule ? 'Update Schedule' : 'Add to Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// COMPONENT: Main Dashboard View
// ==========================================
export function FeedingScheduleView() {
  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id;

  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [scheduleToEdit, setScheduleToEdit] = useState<FeedingSchedule | null>(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-dropdown'],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`SELECT id, name, species, entity_type FROM animals WHERE is_deleted = false ORDER BY name ASC`);
      return res.rows as AnimalOption[];
    }
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['feeding-schedules', viewDate],
    queryFn: async () => {
      await db.waitReady;
      const res = await db.query(`
        SELECT f.*, a.name as animal_name, a.species as animal_species, a.category as animal_category
        FROM feeding_schedules f 
        JOIN animals a ON f.animal_id = a.id 
        WHERE f.is_deleted = false AND DATE(f.next_feed_date) <= DATE($1)
        ORDER BY f.is_completed ASC, a.name ASC
      `, [viewDate]);
      return res.rows as FeedingSchedule[];
    }
  });

  // V3 Atomic Action: Logs feed locally, flags completed for UI
  const markFedMutation = useMutation({
    mutationFn: async (schedule: FeedingSchedule) => {
      await db.waitReady;
      
      await db.query(
        `INSERT INTO daily_logs (animal_id, log_type, log_date, notes, weight_grams, created_by, modified_by) 
         VALUES ($1, 'feed', now(), $2, $3, $4, $4)`,
        [schedule.animal_id, `Fed: ${schedule.food_type}`, schedule.quantity_grams, currentUserId]
      );

      await db.query(
        `UPDATE feeding_schedules 
         SET is_completed = true, completed_at = now(), modified_by = $1 
         WHERE id = $2`,
        [currentUserId, schedule.id]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedules'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      toast.success('Feed logged!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.waitReady;
      await db.query(`UPDATE feeding_schedules SET is_deleted = true, updated_at = now() WHERE id = $1`, [id]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding-schedules'] });
      toast.success('Schedule deleted');
    }
  });

  const filteredSchedules = schedules.filter(schedule => {
    if (activeTab === 'All') return true;
    const cat = (schedule.animal_category || '').toLowerCase();
    const tab = activeTab.toLowerCase();
    return cat === tab || cat + 's' === tab || cat === tab.slice(0, -1);
  });

  const completedCount = filteredSchedules.filter(s => s.is_completed).length;

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-20">
      
      {/* Exact V2 Header & Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Utensils className="text-amber-500" size={28} /> Feeding Schedules
            </h1>
            <div className="flex items-center gap-1 mt-3 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
              <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md">
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 px-3 border-x border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none" />
              </div>
              <button onClick={() => { const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d.toISOString().split('T')[0]); }} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* V2 Scrollable Categories */}
        <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1.5 rounded-xl gap-1 mt-6">
          {CATEGORIES.map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex-1 min-w-fit px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* V2 Exact Side-by-Side Layout */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Hydration-Safe Form Panel */}
        <div className="lg:col-span-4 space-y-6">
          <SchedulePanel 
            key={scheduleToEdit ? scheduleToEdit.id : 'new-schedule'} 
            animals={animals}
            editSchedule={scheduleToEdit}
            onCancelEdit={() => setScheduleToEdit(null)}
            targetDate={viewDate}
          />
        </div>

        {/* Right Column: Interactive Card List */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <History className="text-slate-400" size={18}/> {new Date(viewDate).toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h2>
              </div>
              <div className="text-xs font-bold text-slate-500">
                <span className="text-emerald-600">{completedCount}</span> / {filteredSchedules.length} Completed
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto bg-slate-50/30">
              {isLoading ? (
                 <div className="flex justify-center items-center h-full py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
              ) : filteredSchedules.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                    <Utensils size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold text-slate-600">No feeds scheduled.</p>
                    <p className="text-xs text-slate-500 mt-1">Use the planning engine to add tasks for this date.</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                   {filteredSchedules.map(schedule => (
                     <div key={schedule.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${schedule.is_completed ? 'bg-emerald-50/50 border-emerald-100 opacity-75' : 'bg-white border-slate-200 shadow-sm hover:border-amber-200'}`}>
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between mb-1">
                             <h3 className="font-black text-slate-800 text-sm sm:text-base truncate uppercase">{schedule.animal_name}</h3>
                             {schedule.calci_dust && <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1"><ShieldAlert size={10}/> Calci</span>}
                           </div>
                           <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                             {schedule.quantity_grams ? `${schedule.quantity_grams}g` : 'To appetite'} {schedule.food_type}
                           </p>
                           {schedule.notes && <p className="text-[10px] font-medium text-slate-500 mt-1 truncate">{schedule.notes}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 border-l border-slate-100 pl-4">
                           {!schedule.is_completed && (
                              <>
                                <button 
                                  onClick={() => markFedMutation.mutate(schedule)} 
                                  disabled={markFedMutation.isPending}
                                  className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                                >
                                   {markFedMutation.isPending && markFedMutation.variables?.id === schedule.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                </button>
                                <button 
                                  onClick={() => setScheduleToEdit(schedule)} 
                                  className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                   <Edit2 size={16} />
                                </button>
                              </>
                           )}
                           <button 
                             onClick={() => window.confirm('Delete this feed?') && deleteMutation.mutate(schedule.id)} 
                             className="flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                           >
                              <Trash2 size={18} />
                           </button>
                        </div>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}