import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useAuthStore } from '../../../store/authStore';
import { useAddAnimal, useUpdateAnimal } from '../api/mutations';
import { X, Save, Loader2, Shield, Skull } from 'lucide-react';

const CATEGORIES = ['OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'];
const RED_LIST_STATUSES = ['NE', 'DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];
const HAZARD_RATINGS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any; 
}

export function AnimalFormModal({ isOpen, onClose, initialData }: AnimalFormModalProps) {
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
  
  const addAnimal = useAddAnimal();
  const updateAnimal = useUpdateAnimal();
  const isEditing = !!initialData;
  const [activeTab, setActiveTab] = useState<'basic' | 'id' | 'biometrics' | 'notes'>('basic');

  const form = useForm({
    validatorAdapter: zodValidator,
    defaultValues: {
      entity_type: initialData?.entity_type || 'individual',
      parent_mob_id: initialData?.parent_mob_id || '',
      census_count: initialData?.census_count ? Number(initialData.census_count) : 1,
      name: initialData?.name || '',
      species: initialData?.species || '',
      latin_name: initialData?.latin_name || '',
      category: initialData?.category || '',
      location: initialData?.location || '',
      hazard_rating: initialData?.hazard_rating || 'LOW',
      is_venomous: initialData?.is_venomous || false,
      weight_unit: initialData?.weight_unit || 'g',
      average_target_weight: initialData?.average_target_weight || '',
      date_of_birth: initialData?.date_of_birth || '',
      is_dob_unknown: initialData?.is_dob_unknown || false,
      gender: initialData?.gender || 'Unknown',
      microchip_id: initialData?.microchip_id || '',
      ring_number: initialData?.ring_number || '',
      red_list_status: initialData?.red_list_status || 'NE',
      description: initialData?.description || '',
      special_requirements: initialData?.special_requirements || '',
      critical_husbandry_notes: initialData?.critical_husbandry_notes || '',
      ambient_temp_only: initialData?.ambient_temp_only || false,
      target_day_temp_c: initialData?.target_day_temp_c || '',
      target_night_temp_c: initialData?.target_night_temp_c || '',
      target_humidity_min_percent: initialData?.target_humidity_min_percent || '',
      target_humidity_max_percent: initialData?.target_humidity_max_percent || '',
      misting_frequency: initialData?.misting_frequency || '',
      acquisition_date: initialData?.acquisition_date || '',
      origin: initialData?.origin || '',
      is_boarding: initialData?.is_boarding || false,
      is_quarantine: initialData?.is_quarantine || false,
    },
    onSubmit: async ({ value }) => {
      // Clean up empty strings to null for database strictness
      const parseStr = (v: any) => v === '' ? null : String(v);
      const parseNum = (v: any) => v === '' || v === null ? null : Number(v);

      const payload = {
        entity_type: value.entity_type,
        parent_mob_id: parseStr(value.parent_mob_id),
        census_count: Number(value.census_count),
        name: parseStr(value.name),
        species: parseStr(value.species),
        latin_name: parseStr(value.latin_name),
        category: parseStr(value.category),
        location: parseStr(value.location),
        hazard_rating: parseStr(value.hazard_rating),
        is_venomous: Boolean(value.is_venomous),
        weight_unit: value.weight_unit,
        average_target_weight: parseNum(value.average_target_weight),
        date_of_birth: parseStr(value.date_of_birth),
        is_dob_unknown: Boolean(value.is_dob_unknown),
        gender: parseStr(value.gender),
        microchip_id: parseStr(value.microchip_id),
        ring_number: parseStr(value.ring_number),
        red_list_status: value.red_list_status,
        description: parseStr(value.description),
        special_requirements: parseStr(value.special_requirements),
        critical_husbandry_notes: parseStr(value.critical_husbandry_notes),
        ambient_temp_only: Boolean(value.ambient_temp_only),
        target_day_temp_c: parseNum(value.target_day_temp_c),
        target_night_temp_c: parseNum(value.target_night_temp_c),
        target_humidity_min_percent: parseNum(value.target_humidity_min_percent),
        target_humidity_max_percent: parseNum(value.target_humidity_max_percent),
        misting_frequency: parseStr(value.misting_frequency),
        acquisition_date: parseStr(value.acquisition_date),
        origin: parseStr(value.origin),
        is_boarding: Boolean(value.is_boarding),
        is_quarantine: Boolean(value.is_quarantine),
        currentUserId
      };

      if (isEditing) {
        updateAnimal.mutate({ ...payload, animalId: initialData.id });
      } else {
        addAnimal.mutate({ ...payload, animalId: crypto.randomUUID() });
      }
      onClose();
    }
  });

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500 transition-colors";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-slate-800">
            {isEditing ? 'Edit Animal Record' : 'Add New Animal'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-100 px-6 shrink-0 overflow-x-auto scrollbar-hide">
            <button type="button" onClick={() => setActiveTab('basic')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${activeTab === 'basic' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Basic Info</button>
            <button type="button" onClick={() => setActiveTab('id')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${activeTab === 'id' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>ID & Status</button>
            <button type="button" onClick={() => setActiveTab('biometrics')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${activeTab === 'biometrics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Biometrics & Env</button>
            <button type="button" onClick={() => setActiveTab('notes')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 whitespace-nowrap ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Medical Notes</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="full-animal-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
            
            {/* TAB 1: BASIC INFO */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="name" children={(f) => (
                  <div><label className={labelClass}>Name</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="category" children={(f) => (
                  <div><label className={labelClass}>Category</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}><option value="">Select...</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                )} />
                <form.Field name="species" children={(f) => (
                  <div><label className={labelClass}>Common Species</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="latin_name" children={(f) => (
                  <div><label className={labelClass}>Latin Name</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} italic`} /></div>
                )} />
                <form.Field name="entity_type" children={(f) => (
                  <div><label className={labelClass}>Entity Type</label><select disabled={isEditing} value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}><option value="individual">Individual</option><option value="group">Group / Mob</option></select></div>
                )} />
                <form.Field name="census_count" children={(f) => (
                  <div><label className={labelClass}>Count</label><input type="number" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(Number(e.target.value))} className={inputClass} /></div>
                )} />
                <form.Field name="location" children={(f) => (
                  <div><label className={labelClass}>Enclosure / Location</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="origin" children={(f) => (
                  <div><label className={labelClass}>Origin</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
              </div>
            )}

            {/* TAB 2: ID & STATUS */}
            {activeTab === 'id' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="gender" children={(f) => (
                  <div><label className={labelClass}>Gender</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}><option value="Unknown">Unknown</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                )} />
                <div className="flex gap-2">
                  <form.Field name="date_of_birth" children={(f) => (
                    <div className="flex-1"><label className={labelClass}>Date of Birth</label><input type="date" disabled={form.getFieldValue('is_dob_unknown')} value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                  )} />
                  <form.Field name="is_dob_unknown" children={(f) => (
                    <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={f.state.value} onChange={e => f.handleChange(e.target.checked)} /><span className="text-xs font-bold text-slate-500">Unknown</span></div>
                  )} />
                </div>
                <form.Field name="microchip_id" children={(f) => (
                  <div><label className={labelClass}>Microchip ID</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} font-mono`} /></div>
                )} />
                <form.Field name="ring_number" children={(f) => (
                  <div><label className={labelClass}>Ring/Band Number</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} font-mono`} /></div>
                )} />
                <form.Field name="red_list_status" children={(f) => (
                  <div><label className={labelClass}>IUCN Status</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}>{RED_LIST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                )} />
                <form.Field name="hazard_rating" children={(f) => (
                  <div><label className={labelClass}>Hazard Rating</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}>{HAZARD_RATINGS.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                )} />
                <div className="col-span-1 md:col-span-2 flex flex-wrap gap-4 mt-2">
                  <form.Field name="is_venomous" children={(f) => (
                    <label className="flex items-center gap-2 cursor-pointer bg-red-50 px-4 py-2 rounded-lg border border-red-200 text-red-700 font-bold text-xs uppercase tracking-widest"><input type="checkbox" checked={f.state.value} onChange={e => f.handleChange(e.target.checked)} /><Skull size={14}/> Venomous</label>
                  )} />
                  <form.Field name="is_quarantine" children={(f) => (
                    <label className="flex items-center gap-2 cursor-pointer bg-orange-50 px-4 py-2 rounded-lg border border-orange-200 text-orange-700 font-bold text-xs uppercase tracking-widest"><input type="checkbox" checked={f.state.value} onChange={e => f.handleChange(e.target.checked)} /> In Quarantine</label>
                  )} />
                </div>
              </div>
            )}

            {/* TAB 3: BIOMETRICS & ENVIRONMENT */}
            {activeTab === 'biometrics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="average_target_weight" children={(f) => (
                  <div><label className={labelClass}>Target Weight</label><input type="number" step="0.01" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="weight_unit" children={(f) => (
                  <div><label className={labelClass}>Weight Unit</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}><option value="g">Grams (g)</option><option value="kg">Kilograms (kg)</option></select></div>
                )} />
                <form.Field name="target_day_temp_c" children={(f) => (
                  <div><label className={labelClass}>Day Temp (°C)</label><input type="number" step="0.1" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="target_night_temp_c" children={(f) => (
                  <div><label className={labelClass}>Night Temp (°C)</label><input type="number" step="0.1" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="target_humidity_min_percent" children={(f) => (
                  <div><label className={labelClass}>Min Humidity (%)</label><input type="number" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="target_humidity_max_percent" children={(f) => (
                  <div><label className={labelClass}>Max Humidity (%)</label><input type="number" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="ambient_temp_only" children={(f) => (
                  <div className="col-span-1 md:col-span-2 flex items-center gap-2 pt-2"><input type="checkbox" checked={f.state.value} onChange={e => f.handleChange(e.target.checked)} /><span className="text-sm font-bold text-slate-700">Ambient Temperature Only (No active heating)</span></div>
                )} />
              </div>
            )}

            {/* TAB 4: NOTES */}
            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 gap-4">
                <form.Field name="description" children={(f) => (
                  <div><label className={labelClass}>General Description</label><textarea value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} min-h-[80px] resize-none`} /></div>
                )} />
                <form.Field name="special_requirements" children={(f) => (
                  <div><label className={labelClass}>Special Requirements</label><textarea value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} min-h-[80px] resize-none`} /></div>
                )} />
                <form.Field name="critical_husbandry_notes" children={(f) => (
                  <div><label className={`${labelClass} text-rose-500`}>Critical Medical/Husbandry Alerts</label><textarea value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} min-h-[80px] resize-none border-rose-200 bg-rose-50`} /></div>
                )} />
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-3 text-slate-500 w-full md:w-auto">
            <Shield size={20} className="text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Entry verified for Statutory Ledger</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-100 transition-colors">Discard</button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <button form="full-animal-form" type="submit" disabled={isSubmitting} className="flex-1 md:flex-none px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  {isEditing ? 'Save Changes' : 'Authorize & Create'}
                </button>
              )}
            </form.Subscribe>
          </div>
        </div>

      </div>
    </div>
  );
}