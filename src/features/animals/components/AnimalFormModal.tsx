import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { z } from 'zod';
import { 
    Loader2, ArrowLeft, FileText, Stethoscope, ClipboardList, 
    ShieldAlert, Thermometer, Scale, AlertTriangle, GitMerge, MapPin
} from 'lucide-react';

import { IUCNBadge } from './components/IUCNBadge';
import { ProfileActionBar } from './components/ProfileActionBar';
import { HusbandryLogsTab } from './components/HusbandryLogsTab';
import { MedicalTab } from './components/MedicalTab';
import { SignGenerator } from './components/SignGenerator';
import { AnimalFormModal } from './components/AnimalFormModal';

// 1. FORGIVING ZOD SCHEMA (Handles legacy nulls & string numerics safely)
const FullAnimalSchema = z.object({
    id: z.string().uuid(),
    entity_type: z.string().nullable().transform(v => v || 'individual'),
    parent_mob_id: z.string().nullable(),
    census_count: z.union([z.number(), z.string()]).nullable().transform(v => Number(v) || 1),
    name: z.string().nullable(),
    species: z.string().nullable(),
    latin_name: z.string().nullable(),
    category: z.string().nullable(),
    location: z.string().nullable(),
    image_url: z.string().nullable(),
    distribution_map_url: z.string().nullable(),
    hazard_rating: z.string().nullable(),
    is_venomous: z.boolean().nullable().transform(v => !!v),
    weight_unit: z.string().nullable().transform(v => v || 'g'),
    flying_weight_g: z.union([z.number(), z.string()]).nullable(), 
    winter_weight_g: z.union([z.number(), z.string()]).nullable(),
    average_target_weight: z.union([z.number(), z.string()]).nullable(),
    date_of_birth: z.string().nullable(),
    is_dob_unknown: z.boolean().nullable().transform(v => !!v),
    gender: z.string().nullable(),
    microchip_id: z.string().nullable(),
    ring_number: z.string().nullable(),
    has_no_id: z.boolean().nullable().transform(v => !!v),
    red_list_status: z.string().nullable(),
    description: z.string().nullable(),
    special_requirements: z.string().nullable(),
    critical_husbandry_notes: z.string().nullable(),
    ambient_temp_only: z.boolean().nullable().transform(v => !!v),
    target_day_temp_c: z.union([z.number(), z.string()]).nullable(),
    target_night_temp_c: z.union([z.number(), z.string()]).nullable(),
    water_tipping_temp: z.union([z.number(), z.string()]).nullable(),
    target_humidity_min_percent: z.union([z.number(), z.string()]).nullable(),
    target_humidity_max_percent: z.union([z.number(), z.string()]).nullable(),
    misting_frequency: z.string().nullable(),
    acquisition_date: z.string().nullable(),
    acquisition_type: z.string().nullable(),
    origin: z.string().nullable(),
    origin_location: z.string().nullable(),
    lineage_unknown: z.boolean().nullable().transform(v => !!v),
    sire_id: z.string().nullable(),
    dam_id: z.string().nullable(),
    is_boarding: z.boolean().nullable().transform(v => !!v),
    is_quarantine: z.boolean().nullable().transform(v => !!v),
    display_order: z.union([z.number(), z.string()]).nullable().transform(v => Number(v) || 0),
    archived: z.boolean().nullable().transform(v => !!v),
    archive_reason: z.string().nullable(),
    archive_type: z.string().nullable(),
    is_deleted: z.boolean().nullable().transform(v => !!v),
});

export type ProcessedAnimal = z.infer<typeof FullAnimalSchema>;

interface AnimalProfileViewProps {
    animalId: string;
    onBack: () => void;
}

export function AnimalProfileView({ animalId, onBack }: AnimalProfileViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'husbandry' | 'medical'>('overview');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [signGeneratorOpen, setSignGeneratorOpen] = useState(false);

    const { data: animal, isLoading, isError } = useQuery({
        queryKey: ['animal', animalId],
        refetchInterval: 1500, // Poll to catch background Electric Next stream updates
        queryFn: async () => {
            await db.waitReady;
            const res = await db.query(`SELECT * FROM animals WHERE id = $1 AND is_deleted = false`, [animalId]);
            if (res.rows.length === 0) throw new Error("Animal not found");
            return FullAnimalSchema.parse(res.rows[0]);
        }
    });

    if (isLoading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-12 bg-slate-50">
                <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Decrypting Record...</p>
            </div>
        );
    }

    if (isError || !animal) {
        return (
            <div className="p-8 text-center bg-rose-50 m-6 rounded-2xl border border-rose-100">
                <ShieldAlert className="mx-auto mb-3 text-rose-500" size={32} />
                <h3 className="font-black text-rose-800 uppercase">Vault Integrity Error</h3>
                <p className="text-sm text-rose-600 mb-4">Could not verify this animal record. It may be missing schema fields.</p>
                <button onClick={onBack} className="px-4 py-2 bg-white text-rose-600 rounded-lg font-bold text-sm shadow-sm">Return to Roster</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-y-auto">
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-20 shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
                        <ArrowLeft size={18} />
                        <span className="font-bold uppercase tracking-widest text-xs">Roster</span>
                    </button>
                    
                    <ProfileActionBar 
                        onEdit={() => setEditModalOpen(true)}
                        onSign={() => setSignGeneratorOpen(true)}
                        animal={animal as any}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 space-y-6">
                <div className="max-w-5xl mx-auto">
                    
                    <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-6 md:items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60"></div>
                        
                        {/* 2. DYNAMIC PROFILE IMAGE RENDERER */}
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-100 rounded-2xl border-4 border-white shadow-lg overflow-hidden shrink-0 z-10 flex items-center justify-center">
                            {animal.image_url ? (
                                <img src={animal.image_url} alt={animal.name || 'Profile'} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-5xl font-black text-slate-300 uppercase">{animal.name?.charAt(0) || '?'}</span>
                            )}
                        </div>
                        
                        <div className="flex-1 z-10">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                                {animal.entity_type === 'group' && (
                                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <GitMerge size={12} /> Mob/Group ({animal.census_count})
                                    </span>
                                )}
                                {animal.is_venomous && (
                                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <AlertTriangle size={12} /> Venomous
                                    </span>
                                )}
                                {animal.hazard_rating && animal.hazard_rating !== 'LOW' && (
                                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                        Hazard: {animal.hazard_rating}
                                    </span>
                                )}
                                <IUCNBadge status={animal.red_list_status || 'NE'} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1">
                                {animal.name || 'Unnamed Individual'}
                            </h1>
                            <p className="text-lg font-medium text-slate-500 mb-4">{animal.species} <span className="italic opacity-70">({animal.latin_name})</span></p>
                            
                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span className="flex items-center gap-1"><MapPin size={14}/> {animal.location || 'Location Not Set'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-200 mb-6">
                        <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Overview</button>
                        <button onClick={() => setActiveTab('husbandry')} className={`px-6 py-4 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'husbandry' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            <ClipboardList size={16} /> Husbandry Logs
                        </button>
                        <button onClick={() => setActiveTab('medical')} className={`px-6 py-4 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'medical' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            <Stethoscope size={16} /> Medical History
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 min-h-[400px]">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><FileText size={14}/> Identifiers & Origin</h3>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">System ID</span><span className="text-sm font-mono text-slate-700">{animal.id.split('-')[0]}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Microchip</span><span className="text-sm font-medium text-slate-700">{animal.microchip_id || 'N/A'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Ring/Band</span><span className="text-sm font-medium text-slate-700">{animal.ring_number || 'N/A'}</span></div>
                                            <div className="flex justify-between border-t border-slate-200 pt-3"><span className="text-sm font-bold text-slate-500">Acquisition</span><span className="text-sm font-medium text-slate-700">{animal.acquisition_date || 'Unknown'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Origin</span><span className="text-sm font-medium text-slate-700">{animal.origin || 'Unknown'}</span></div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Scale size={14}/> Biometrics</h3>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Gender</span><span className="text-sm font-medium text-slate-700 capitalize">{animal.gender || 'Unknown'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Target Weight</span><span className="text-sm font-medium text-slate-700">{animal.average_target_weight ? `${animal.average_target_weight}${animal.weight_unit}` : 'Not Set'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">DOB</span><span className="text-sm font-medium text-slate-700">{animal.is_dob_unknown ? 'Unknown' : (animal.date_of_birth || 'Not Recorded')}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Thermometer size={14}/> Environment</h3>
                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Day Temp</span><span className="text-sm font-medium text-slate-700">{animal.target_day_temp_c ? `${animal.target_day_temp_c}°C` : 'Ambient'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Night Temp</span><span className="text-sm font-medium text-slate-700">{animal.target_night_temp_c ? `${animal.target_night_temp_c}°C` : 'Ambient'}</span></div>
                                            <div className="flex justify-between"><span className="text-sm font-bold text-slate-500">Humidity Range</span><span className="text-sm font-medium text-slate-700">{animal.target_humidity_min_percent ? `${animal.target_humidity_min_percent}% - ${animal.target_humidity_max_percent}%` : 'N/A'}</span></div>
                                        </div>
                                    </div>

                                    {animal.description && (
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</h3>
                                            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{animal.description}</p>
                                        </div>
                                    )}

                                    {animal.critical_husbandry_notes && (
                                        <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-2 flex items-center gap-2"><AlertTriangle size={14}/> Critical Notes</h3>
                                            <p className="text-sm text-rose-800 font-medium">{animal.critical_husbandry_notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'husbandry' && <HusbandryLogsTab animalId={animalId} />}
                        {activeTab === 'medical' && <MedicalTab animalId={animalId} />}
                    </div>

                </div>
            </div>

            <AnimalFormModal 
                isOpen={editModalOpen} 
                onClose={() => setEditModalOpen(false)} 
                initialData={animal} 
            />
            
            {signGeneratorOpen && <SignGenerator animal={animal as any} onClose={() => setSignGeneratorOpen(false)} />}
        </div>
    );
}