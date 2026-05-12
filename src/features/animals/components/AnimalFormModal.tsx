import React, { useState, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { useAuthStore } from '../../../store/authStore';
import { useAddAnimal, useUpdateAnimal } from '../api/mutations';
import { X, Save, Loader2, Shield, Skull, Image as ImageIcon, Map as MapIcon, UploadCloud } from 'lucide-react';

const CATEGORIES = ['OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'];
const RED_LIST_STATUSES = ['NE', 'DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];
const HAZARD_RATINGS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const WEIGHT_UNITS = [
  { label: 'Grams (g)', value: 'g' },
  { label: 'Ounces (oz)', value: 'oz' },
  { label: 'Pounds/Ounces (lb/oz)', value: 'lb' }
];

interface AnimalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any; 
}

// ARCHITECT NOTE: High-performance canvas compressor for base64
const processImageFile = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target?.result as string;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 800; // Limit dimensions to keep base64 payload under 250kb
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG at 70% quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(dataUrl);
    };
  };
};

export function AnimalFormModal({ isOpen, onClose, initialData }: AnimalFormModalProps) {
  const session = useAuthStore(s => s.session);
  const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';
  
  const addAnimal = useAddAnimal();
  const updateAnimal = useUpdateAnimal();
  const isEditing = !!initialData;
  const [activeTab, setActiveTab] = useState<'basic' | 'id' | 'biometrics' | 'media' | 'notes'>('basic');

  const profileFileRef = useRef<HTMLInputElement>(null);
  const mapFileRef = useRef<HTMLInputElement>(null);

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
      image_url: initialData?.image_url || '',
      distribution_map_url: initialData?.distribution_map_url || '',
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
      const parseStr = (v: any) => v === '' ? null : String(v);
      const parseNum = (v: any) => v === '' || v === null ? null : Number(v);

      const payload = {
        ...value,
        parent_mob_id: parseStr(value.parent_mob_id),
        name: parseStr(value.name),
        species: parseStr(value.species),
        latin_name: parseStr(value.latin_name),
        category: parseStr(value.category),
        location: parseStr(value.location),
        image_url: parseStr(value.image_url),
        distribution_map_url: parseStr(value.distribution_map_url),
        hazard_rating: parseStr(value.hazard_rating),
        average_target_weight: parseNum(value.average_target_weight),
        target_day_temp_c: parseNum(value.target_day_temp_c),
        target_night_temp_c: parseNum(value.target_night_temp_c),
        target_humidity_min_percent: parseNum(value.target_humidity_min_percent),
        target_humidity_max_percent: parseNum(value.target_humidity_max_percent),
        currentUserId
      };

      if (isEditing) {
        updateAnimal.mutate({ ...payload, animalId: initialData.id } as any);
      } else {
        addAnimal.mutate({ ...payload, animalId: crypto.randomUUID() } as any);
      }
      onClose();
    }
  });

  if (!isOpen) return null;

  // High Contrast Text (slate-900)
  const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">
            {isEditing ? 'Edit Record' : 'Registry Entry'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-100 px-6 shrink-0 overflow-x-auto scrollbar-hide bg-slate-50/50">
            {['basic', 'id', 'biometrics', 'media', 'notes'].map((tab) => (
              <button 
                key={tab}
                type="button" 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 whitespace-nowrap transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab === 'biometrics' ? 'Biometrics & Env' : tab.replace('_', ' ')}
              </button>
            ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
          <form id="full-animal-form" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-6">
            
            {activeTab === 'basic' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="name" children={(f) => (
                  <div><label className={labelClass}>Name / Identifier</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} placeholder="e.g. Barnaby" /></div>
                )} />
                <form.Field name="category" children={(f) => (
                  <div><label className={labelClass}>Category</label><select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}><option value="">Select...</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                )} />
                <form.Field name="species" children={(f) => (
                  <div><label className={labelClass}>Common Species</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} placeholder="e.g. Barn Owl" /></div>
                )} />
                <form.Field name="latin_name" children={(f) => (
                  <div><label className={labelClass}>Latin Name</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} italic`} placeholder="e.g. Tyto alba" /></div>
                )} />
                <form.Field name="location" children={(f) => (
                  <div><label className={labelClass}>Enclosure / Location</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} placeholder="e.g. Block A, Aviary 4" /></div>
                )} />
                <form.Field name="origin" children={(f) => (
                  <div><label className={labelClass}>Origin / Source</label><input value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
              </div>
            )}

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
                    <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={f.state.value} onChange={e => f.handleChange(e.target.checked)} /><span className="text-[10px] font-bold text-slate-500 uppercase">Unknown</span></div>
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
              </div>
            )}

            {activeTab === 'biometrics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="average_target_weight" children={(f) => (
                  <div><label className={labelClass}>Target Weight Value</label><input type="number" step="0.01" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="weight_unit" children={(f) => (
                  <div>
                    <label className={labelClass}>Weight Unit System</label>
                    <select value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass}>
                      {WEIGHT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                )} />
                <form.Field name="target_day_temp_c" children={(f) => (
                  <div><label className={labelClass}>Target Day Temp (°C)</label><input type="number" step="0.1" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
                <form.Field name="target_night_temp_c" children={(f) => (
                  <div><label className={labelClass}>Target Night Temp (°C)</label><input type="number" step="0.1" value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={inputClass} /></div>
                )} />
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-8">
                {/* Profile Photo Uploader */}
                <form.Field name="image_url" children={(f) => (
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <label className={labelClass}>Profile Photo</label>
                    <div className="flex gap-6 items-center">
                      <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {f.state.value ? <img src={f.state.value} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 space-y-3">
                        <input type="file" accept="image/*" ref={profileFileRef} className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processImageFile(e.target.files[0], (base64) => f.handleChange(base64));
                          }
                        }} />
                        <button type="button" onClick={() => profileFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-sm font-bold text-slate-700 transition-colors">
                          <UploadCloud size={16} className="text-indigo-500"/> Select Local Image
                        </button>
                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight">Image will be automatically downsized and compressed before saving to the vault to preserve performance.</p>
                      </div>
                    </div>
                  </div>
                )} />
                
                {/* Distribution Map Uploader */}
                <form.Field name="distribution_map_url" children={(f) => (
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <label className={labelClass}>Distribution Map</label>
                    <div className="flex gap-6 items-center">
                      <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {f.state.value ? <img src={f.state.value} className="w-full h-full object-cover" /> : <MapIcon size={32} className="text-slate-300"/>}
                      </div>
                      <div className="flex-1 space-y-3">
                        <input type="file" accept="image/*" ref={mapFileRef} className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processImageFile(e.target.files[0], (base64) => f.handleChange(base64));
                          }
                        }} />
                        <button type="button" onClick={() => mapFileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-sm font-bold text-slate-700 transition-colors">
                          <UploadCloud size={16} className="text-indigo-500"/> Select Map Image
                        </button>
                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight">Image will be automatically downsized and compressed before saving to the vault to preserve performance.</p>
                      </div>
                    </div>
                  </div>
                )} />
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="grid grid-cols-1 gap-4">
                <form.Field name="description" children={(f) => (
                  <div><label className={labelClass}>General Description</label><textarea value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} min-h-[100px] resize-none py-4`} /></div>
                )} />
                <form.Field name="critical_husbandry_notes" children={(f) => (
                  <div><label className={`${labelClass} text-rose-600`}>Critical Husbandry Alerts</label><textarea value={f.state.value} onBlur={f.handleBlur} onChange={e => f.handleChange(e.target.value)} className={`${inputClass} min-h-[100px] resize-none py-4 border-rose-200 bg-rose-50/50`} /></div>
                )} />
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3 text-slate-500">
            <Shield size={18} className="text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Verified Registry Entry</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Discard</button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <button form="full-animal-form" type="submit" disabled={isSubmitting} className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                  {isEditing ? 'Update Record' : 'Authorize Entry'}
                </button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </div>
  );
}