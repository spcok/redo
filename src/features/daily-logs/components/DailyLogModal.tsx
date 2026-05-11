import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { X, Trash2, Save, Loader2 } from 'lucide-react';
import { useDailyLog, useSaveDailyLog, useDeleteDailyLog } from '../api/dailyLogApi';
import { useAuthStore } from '../../../store/authStore';

const formSchema = z.object({
  log_type: z.enum(["weight", "feed", "temperature", "misting", "events", "general"]),
  log_date: z.string(),
  notes: z.string().nullable().optional(),
  weight_grams: z.union([z.number(), z.string()]).nullable().optional(),
  temperature_c: z.union([z.number(), z.string()]).nullable().optional(),
});

type DailyLogFormValues = z.infer<typeof formSchema>;

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  animalId: string;
  existingLogId?: string;
  initialType?: string;
}

export function DailyLogModal(props: DailyLogModalProps) {
  if (!props.isOpen) return null;

  const { data: existingData, isLoading } = useDailyLog(props.existingLogId);

  if (props.existingLogId && (isLoading || !existingData)) {
    return <div className="fixed inset-0 bg-slate-900/80 flex justify-center items-center z-50 text-emerald-400 font-mono">Loading data from vault...</div>;
  }

  const parsedDate = existingData?.log_date 
    ? new Date(existingData.log_date).toISOString().slice(0, 16) 
    : new Date().toISOString().slice(0, 16);

  const initialData: DailyLogFormValues = {
    log_type: (existingData?.log_type as DailyLogFormValues['log_type']) || (props.initialType as DailyLogFormValues['log_type']) || 'general',
    log_date: parsedDate,
    notes: existingData?.notes || '',
    weight_grams: existingData?.weight_grams || '',
    temperature_c: existingData?.temperature_c || '',
  };

  return <DailyLogForm {...props} initialData={initialData} animalUnit="g" />;
}

function DailyLogForm({ onClose, animalId, existingLogId, initialData, animalUnit }: DailyLogModalProps & { initialData: DailyLogFormValues, animalUnit: string }) {
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const [logType, setLogType] = useState<DailyLogFormValues['log_type']>(initialData.log_type);

  const saveMutation = useSaveDailyLog(existingLogId);
  const deleteMutation = useDeleteDailyLog();

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: initialData,
    onSubmit: async ({ value }) => {
      const num = (v: string | number | null | undefined) => (v === "" || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

      await saveMutation.mutateAsync({
        animal_id: animalId,
        log_type: value.log_type,
        log_date: new Date(value.log_date).toISOString(),
        notes: value.notes ? String(value.notes).trim() : null,
        weight_grams: logType === 'weight' ? num(value.weight_grams) : null,
        temperature_c: logType === 'temperature' ? num(value.temperature_c) : null,
        weight_unit: animalUnit,
        current_user_id: currentUserId,
      });
      onClose();
    },
  });

  const handleDelete = () => {
    if (!existingLogId) return;
    if (window.confirm('Are you sure you want to delete this log?')) {
      deleteMutation.mutate({ id: existingLogId, userId: currentUserId }, { onSuccess: () => onClose() });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-black tracking-tight text-slate-800">{existingLogId ? 'Edit Record' : 'New Record'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 scrollbar-hide">
          <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="log_date" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input type="datetime-local" name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              )} />
              <form.Field name="log_type" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</label>
                  <select name={field.name} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => {
                    const val = e.target.value as DailyLogFormValues['log_type'];
                    field.handleChange(val);
                    setLogType(val);
                  }} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500 capitalize">
                    {["weight", "feed", "temperature", "misting", "events", "general"].map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
              )} />
            </div>
            
            {logType === 'weight' && (
              <form.Field name="weight_grams" children={(field) => (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Weight ({animalUnit})</label>
                  <input type="number" value={field.state.value || ''} onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 1050" />
                </div>
              )} />
            )}

            {logType === 'temperature' && (
              <form.Field name="temperature_c" children={(field) => (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Temperature (°C)</label>
                  <input type="number" name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value ? Number(e.target.value) : "")} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              )} />
            )}
            
            <form.Field name="notes" children={(field) => (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notes (Optional)</label>
                <textarea name={field.name} value={field.state.value || ''} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 min-h-[80px]" />
              </div>
            )} />
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-3 shrink-0">
          {existingLogId ? (
            <button type="button" onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2" disabled={saveMutation.isPending || deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
            </button>
          ) : <div></div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors">Cancel</button>
            <button type="button" onClick={() => form.handleSubmit()} disabled={saveMutation.isPending || deleteMutation.isPending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-colors flex items-center gap-2">
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}