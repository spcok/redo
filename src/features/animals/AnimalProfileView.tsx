import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { z } from 'zod';
import { 
    Loader2, ArrowLeft, FileText, Stethoscope, ClipboardList, 
    ShieldAlert, Thermometer, Scale, AlertTriangle, GitMerge
} from 'lucide-react';

// Sub-components
import { IUCNBadge } from './components/IUCNBadge';
import { ProfileActionBar } from './components/ProfileActionBar';
import { HusbandryLogsTab } from './components/HusbandryLogsTab';
import { MedicalTab } from './components/MedicalTab';
import { SignGenerator } from './components/SignGenerator';

// 1. STRICT ZOD SCHEMA
const FullAnimalSchema = z.object({
    id: z.string().uuid(),
    entity_type: z.string(),
    parent_mob_id: z.string().nullable(),
    census_count: z.union([z.number(), z.string()]), // Integers come as string
    name: z.string().nullable(),
    species: z.string().nullable(),
    latin_name: z.string().nullable(),
    category: z.string().nullable(),
    location: z.string().nullable(),
    image_url: z.string().nullable(),
    distribution_map_url: z.string().nullable(),
    hazard_rating: z.string().nullable(),
    is_venomous: z.boolean(),
    weight_unit: z.string(),
    flying_weight_g: z.union([z.number(), z.string()]).nullable(), // Numerics come as string
    winter_weight_g: z.union([z.number(), z.string()]).nullable(),
    average_target_weight: z.union([z.number(), z.string()]).nullable(),
    date_of_birth: z.string().nullable(),
    is_dob_unknown: z.boolean(),
    gender: z.string().nullable(),
    microchip_id: z.string().nullable(),
    ring_number: z.string().nullable(),
    has_no_id: z.boolean(),
    red_list_status: z.string().nullable(),
    description: z.string().nullable(),
    special_requirements: z.string().nullable(),
    critical_husbandry_notes: z.string().nullable(),
    ambient_temp_only: z.boolean(),
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
    lineage_unknown: z.boolean(),
    sire_id: z.string().nullable(),
    dam_id: z.string().nullable(),
    is_boarding: z.boolean(),
    is_quarantine: z.boolean(),
    display_order: z.union([z.number(), z.string()]),
    archived: z.boolean(),
    archive_reason: z.string().nullable(),
    archive_type: z.string().nullable(),
    is_deleted: z.boolean(),
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
                <p className="text-sm text-rose-600 mb-4">Could not verify this animal record.</p>
                <button onClick={onBack} className="px-4 py-2 bg-white text-rose-600 rounded-lg font-bold text-sm shadow-sm">Return to Roster</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 overflow-y-auto">
            {/* Action Bar & Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-20 shrink-0">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
                        <ArrowLeft size={18} />
                        <span className="font-bold uppercase tracking-widest text-xs">Roster</span>
                    </button>
                    {/* V3 FIX: Strict Prop Typing */}
                    <ProfileActionBar animal={animal} onEdit={() => setEditModalOpen(true)} onSign={() => setSignGeneratorOpen(true)} />
                </div>
            </div>

            <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
                {/* Header Profile Section */}
                <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <div className="w-32 h-32 md:w-48 md:h-48 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden shrink-0 flex items-center justify-center relative group">
                        {animal.image_url ? (
                            <img src={animal.image_url} alt={animal.name || 'Animal'} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300 font-black uppercase text-xs">No Image</div>
                        )}
                        {animal.is_venomous && (
                            <div className="absolute top-2 right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white" title="Venomous">
                                <AlertTriangle size={16} className="text-white" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4 w-full">
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1">
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight break-words">{animal.name || 'Unnamed'}</h1>
                                <IUCNBadge status={animal.red_list_status || 'NE'} />
                            </div>
                            <p className="text-base md:text-lg font-bold text-slate-500 uppercase tracking-widest break-words">{animal.species} <span className="text-slate-400 italic normal-case ml-2">{animal.latin_name}</span></p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 uppercase tracking-widest">{animal.category}</span>
                            {animal.gender && <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-black text-indigo-700 uppercase tracking-widest">{animal.gender}</span>}
                            <span className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1">
                                {animal.entity_type === 'group' ? <GitMerge size={12}/> : null} Count: {animal.census_count}
                            </span>
                        </div>

                        {(animal.ring_number || animal.microchip_id) && (
                            <div className="flex flex-wrap gap-4 pt-2">
                                {animal.ring_number && <div className="flex items-center gap-2 text-sm font-bold text-slate-600"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Ring: <span className="font-mono">{animal.ring_number}</span></div>}
                                {animal.microchip_id && <div className="flex items-center gap-2 text-sm font-bold text-slate-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Chip: <span className="font-mono">{animal.microchip_id}</span></div>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex overflow-x-auto scrollbar-hide bg-slate-200 p-1.5 rounded-2xl gap-1 mb-8">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><FileText size={16} className="inline md:mr-2 -mt-0.5" /> <span className="hidden md:inline">Overview</span></button>
                    <button onClick={() => setActiveTab('husbandry')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'husbandry' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><ClipboardList size={16} className="inline md:mr-2 -mt-0.5" /> <span className="hidden md:inline">Logs</span></button>
                    <button onClick={() => setActiveTab('medical')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'medical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}><Stethoscope size={16} className="inline md:mr-2 -mt-0.5" /> <span className="hidden md:inline">Medical</span></button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2"><FileText size={16} className="text-emerald-500"/> Core Details</h3>
                                <div className="space-y-4">
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Record Type</span><span className="text-sm font-bold text-slate-700 capitalize">{animal.entity_type} {animal.entity_type === 'group' ? `(Count: ${animal.census_count})` : ''}</span></div>
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Gender</span><span className="text-sm font-bold text-slate-700 capitalize">{animal.gender || 'Unknown'}</span></div>
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Date of Birth</span><span className="text-sm font-bold text-slate-700">{animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : 'Unknown'}</span></div>
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Ring / Microchip ID</span><span className="text-sm font-bold text-slate-700 font-mono">{animal.ring_number || animal.microchip_id || 'None'}</span></div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2"><Thermometer size={16} className="text-amber-500"/> Environmental Targets</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Day Temp</span><span className="text-sm font-bold text-slate-700">{animal.target_day_temp_c !== null ? `${animal.target_day_temp_c}°C` : 'N/A'}</span></div>
                                    <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Night Temp</span><span className="text-sm font-bold text-slate-700">{animal.target_night_temp_c !== null ? `${animal.target_night_temp_c}°C` : 'N/A'}</span></div>
                                    <div className="col-span-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Humidity Target</span><span className="text-sm font-bold text-slate-700">{animal.target_humidity_min_percent !== null ? `${animal.target_humidity_min_percent}% - ${animal.target_humidity_max_percent}%` : 'N/A'}</span></div>
                                    <div className="col-span-2"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Misting Protocol</span><span className="text-sm font-bold text-slate-700">{animal.misting_frequency || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Child Tabs */}
                {activeTab === 'medical' && <MedicalTab animalId={animal.id} />}
                {activeTab === 'husbandry' && <HusbandryLogsTab animalId={animal.id} />}
            </div>

            {/* V3 FIX: Strict Prop Typing */}
            {signGeneratorOpen && <SignGenerator animal={animal} onClose={() => setSignGeneratorOpen(false)} orgProfile={null} />}
        </div>
    );
}