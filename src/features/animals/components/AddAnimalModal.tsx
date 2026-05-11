import React from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useAuthStore } from '../../../store/authStore';
import { X, Save, Loader2, Info } from 'lucide-react';

const animalSchema = z.object({
  entity_type: z.enum(['individual', 'group']),
  parent_mob_id: z.string().uuid().nullable().optional(),
  census_count: z.number().int().min(0).default(1),
  name: z.string().nullable().optional(),
  species: z.string().nullable().optional(),
  latin_name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  weight_unit: z.enum(['g', 'kg', 'oz', 'lb']).default('g'),
  red_list_status: z.string().default('LC'),
});

type AddAnimalValues = z.infer<typeof animalSchema>;

const CATEGORIES = ['OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'];
const RED_LIST_STATUSES = ['NE', 'DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];

interface AddAnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAnimalModal({ isOpen, onClose }: AddAnimalModalProps) {
  if (!isOpen) return null;

  const queryClient = useQueryClient();
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

  const saveMutation = useMutation({
    mutationFn: async (val: AddAnimalValues) => {
      await db.waitReady;
      await db.query(
        `INSERT INTO animals (
          entity_type, parent_mob_id, census_count, name, species, latin_name, 
          category, weight_unit, red_list_status, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          val.entity_type, val.parent_mob_id || null, val.census_count, val.name || null,
          val.species || null, val.latin_name || null, val.category || null, 
          val.weight_unit, val.red_list_status, currentUserId
        ]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals_master'] });
      onClose();
    }
  });

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      entity_type: 'individual',
      census_count: 1,
      weight_unit: 'g',
      red_list_status: 'LC',
    } as AddAnimalValues,
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value);
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-black tracking-tight text-slate-800">Add New Animal</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="add-animal-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
              <Info className="text-indigo-500 shrink-0" size={20} />
              <div className="text-sm text-indigo-900 font-medium">
                Individuals represent single animals (e.g. an Owl). Groups represent a colony tracked as a single unit (e.g. Mice).
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="entity_type">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entity Type</label>
                    {/* V3 FIX: Strict union type instead of 'as any' */}
                    <select value={field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value as 'individual' | 'group')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors">
                      <option value="individual">Individual</option>
                      <option value="group">Group / Mob</option>
                    </select>
                  </div>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.values.entity_type}>
                {(entityType) => (
                  <form.Field name="census_count">
                    {(field) => (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Initial Count</label>
                        <input type="number" min="1" disabled={entityType === 'individual'} value={entityType === 'individual' ? 1 : field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors" />
                      </div>
                    )}
                  </form.Field>
                )}
              </form.Subscribe>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="name">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Name / Identifier</label>
                    <input value={field.state.value || ''} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} placeholder="e.g. Barnaby" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                )}
              </form.Field>

              <form.Field name="category">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Category</label>
                    <select value={field.state.value || ''} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors">
                      <option value="">-- Select --</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="species">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Common Species</label>
                    <input value={field.state.value || ''} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} placeholder="e.g. Barn Owl" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                )}
              </form.Field>

              <form.Field name="latin_name">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latin Name</label>
                    <input value={field.state.value || ''} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value === '' ? null : e.target.value)} placeholder="e.g. Tyto alba" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors italic" />
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="red_list_status">
                {(field) => (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">IUCN Status</label>
                    <select value={field.state.value} onBlur={field.handleBlur} onChange={e => field.handleChange(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors">
                      {RED_LIST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </form.Field>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
          <button form="add-animal-form" type="submit" disabled={saveMutation.isPending} className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
            {saveMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Create Record
          </button>
        </div>
      </div>
    </div>
  );
}