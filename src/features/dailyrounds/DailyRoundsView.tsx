import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { 
    ClipboardCheck, Sun, Moon, Check, X, Droplets, Lock, 
    Heart, Loader2, Calendar as CalendarIcon,
    Info, ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react';

const CATEGORIES = ['All', 'OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'];

// V3 FIX: Strict interfaces
type Animal = {
    id: string;
    name: string;
    species: string;
    category: string;
    entity_type: string;
};

type RoundCheck = {
  id?: string;
  is_alive: boolean | null;
  water_checked: boolean | null;
  locks_secured: boolean | null;
};

export function DailyRoundsView() {
    const queryClient = useQueryClient();
    const session = useAuthStore((state) => state.session);
    const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
    const [roundType, setRoundType] = useState('Morning');
    const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
    
    const [signingInitials, setSigningInitials] = useState('');
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState<'HEALTH' | 'SECURITY'>('HEALTH');
    const [reportAnimalId, setReportAnimalId] = useState<string | null>(null);
    const [issueText, setIssueText] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['daily_rounds', viewDate, roundType, activeTab],
        queryFn: async () => {
            await db.waitReady;
            
            let animalQuery = "SELECT * FROM animals WHERE is_deleted = false";
            const params: any[] = [];

            if (activeTab !== 'All') {
                animalQuery += ` AND category = $1`;
                params.push(activeTab);
            }
            animalQuery += " ORDER BY entity_type DESC, name ASC";

            const animalRes = await db.query(animalQuery, params);
            
            const roundRes = await db.query(
                "SELECT * FROM daily_rounds WHERE date = $1 AND shift = $2 AND is_deleted = false",
                [viewDate, roundType]
            );
            
            const checksMap: Record<string, RoundCheck> = {};
            roundRes.rows.forEach((r: any) => { checksMap[r.animal_id] = r; });
            
            // V3 FIX: Strict Array Casting
            return { animals: animalRes.rows as Animal[], checks: checksMap };
        }
    });

    const animals = data?.animals || [];
    const checks = data?.checks || {};

    const totalAnimals = animals.length;
    const completedChecks = animals.filter(a => {
        const state = checks[a.id];
        if (!state) return false;
        return state.is_alive !== null && state.water_checked !== null && state.locks_secured !== null;
    }).length;
    const progress = totalAnimals === 0 ? 0 : Math.round((completedChecks / totalAnimals) * 100);
    const isComplete = totalAnimals > 0 && progress === 100;

    const toggleMutation = useMutation({
        mutationFn: async ({ animalId, field, value, note }: { animalId: string, field: 'is_alive' | 'water_checked' | 'locks_secured', value: boolean, note?: string }) => {
            await db.waitReady;
            const existing = checks[animalId];
            
            if (existing && existing.id) {
                const query = field === 'is_alive' 
                    ? `UPDATE daily_rounds SET is_alive = $1, animal_issue_note = $2, updated_at = now(), modified_by = $3 WHERE id = $4`
                    : field === 'water_checked'
                    ? `UPDATE daily_rounds SET water_checked = $1, animal_issue_note = $2, updated_at = now(), modified_by = $3 WHERE id = $4`
                    : `UPDATE daily_rounds SET locks_secured = $1, animal_issue_note = $2, updated_at = now(), modified_by = $3 WHERE id = $4`;
                
                await db.query(query, [value, note || null, currentUserId, existing.id]);
            } else {
                const query = field === 'is_alive'
                    ? `INSERT INTO daily_rounds (animal_id, date, shift, is_alive, animal_issue_note, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $6)`
                    : field === 'water_checked'
                    ? `INSERT INTO daily_rounds (animal_id, date, shift, water_checked, animal_issue_note, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $6)`
                    : `INSERT INTO daily_rounds (animal_id, date, shift, locks_secured, animal_issue_note, created_by, modified_by) VALUES ($1, $2, $3, $4, $5, $6, $6)`;
                
                await db.query(query, [animalId, viewDate, roundType, value, note || null, currentUserId]);
            }
        },
        onMutate: async ({ animalId, field, value }) => {
            await queryClient.cancelQueries({ queryKey: ['daily_rounds', viewDate, roundType, activeTab] });
            const previousData = queryClient.getQueryData(['daily_rounds', viewDate, roundType, activeTab]);
            
            queryClient.setQueryData(['daily_rounds', viewDate, roundType, activeTab], (old: any) => {
                if (!old) return old;
                const newChecks = { ...old.checks };
                if (!newChecks[animalId]) newChecks[animalId] = { is_alive: null, water_checked: null, locks_secured: null };
                newChecks[animalId][field] = value;
                return { ...old, checks: newChecks };
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) queryClient.setQueryData(['daily_rounds', viewDate, roundType, activeTab], context.previousData);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['daily_rounds'] })
    });

    const handleAction = (animalId: string, field: 'is_alive' | 'water_checked' | 'locks_secured', value: boolean, note?: string) => toggleMutation.mutate({ animalId, field, value, note });

    const confirmIssue = () => {
        if (!reportAnimalId || !issueText) return;
        if (reportType === 'HEALTH') handleAction(reportAnimalId, 'is_alive', false, issueText);
        else handleAction(reportAnimalId, 'locks_secured', false, issueText);
        setReportModalOpen(false);
        setIssueText('');
    };

    const changeDate = (days: number) => {
        const d = new Date(viewDate); 
        d.setDate(d.getDate() + days);
        setViewDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto space-y-6 pb-24">
                <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6 shadow-sm sticky top-0 z-20">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <ClipboardCheck className="text-emerald-600" size={28} /> Daily Rounds
                            </h1>
                            <div className="flex items-center gap-1 mt-3 bg-slate-50 border border-slate-200 rounded-lg p-1 w-fit shadow-sm">
                                <button onClick={() => changeDate(-1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronLeft size={16} /></button>
                                <div className="flex items-center gap-2 px-3 border-x border-slate-200">
                                    <CalendarIcon size={14} className="text-slate-400" />
                                    <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none" />
                                </div>
                                <button onClick={() => changeDate(1)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-md"><ChevronRight size={16} /></button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <button onClick={() => setRoundType('Morning')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${roundType === 'Morning' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Sun size={16} /> Morning</button>
                            <button onClick={() => setRoundType('Evening')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${roundType === 'Evening' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Moon size={16} /> Evening</button>
                        </div>
                    </div>
                    
                    <div className="flex overflow-x-auto scrollbar-hide bg-slate-100 p-1.5 rounded-xl gap-1 mt-6">
                        {CATEGORIES.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-fit px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab}</button>
                        ))}
                    </div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto space-y-3">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
                    ) : animals.length === 0 ? (
                        <div className="text-center py-12 opacity-50"><Info className="mx-auto mb-2 text-slate-300" size={32}/><p className="font-bold text-slate-400 text-sm">No animals found for '{activeTab}'.</p></div>
                    ) : (
                        animals.map(animal => {
                            const state = checks[animal.id] || { is_alive: null, water_checked: null, locks_secured: null };
                            const isDone = state.is_alive !== null && state.water_checked !== null && state.locks_secured !== null;
                            const hasIssue = state.is_alive === false || state.locks_secured === false;

                            return (
                                <div key={animal.id} className={`bg-white border-2 rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-6 transition-all ${isDone && !hasIssue ? 'border-emerald-100 shadow-sm' : hasIssue ? 'border-rose-100 bg-rose-50' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-slate-800 text-sm md:text-base truncate uppercase">{animal.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{animal.species}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => state.is_alive === false ? handleAction(animal.id, 'is_alive', true) : setReportModalOpen(true) & setReportType('HEALTH') & setReportAnimalId(animal.id)} className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.is_alive === true ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : state.is_alive === false ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                                            <Heart size={20} fill={state.is_alive === true ? "currentColor" : "none"} />
                                        </button>
                                        <button onClick={() => handleAction(animal.id, 'water_checked', true)} className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.water_checked ? 'border-blue-100 bg-blue-50 text-blue-500' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                                            {state.water_checked ? <Check size={20} strokeWidth={4} /> : <Droplets size={20} />}
                                        </button>
                                        <button onClick={() => state.locks_secured === false ? handleAction(animal.id, 'locks_secured', true) : setReportModalOpen(true) & setReportType('SECURITY') & setReportAnimalId(animal.id)} className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all ${state.locks_secured === true ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : state.locks_secured === false ? 'border-rose-200 bg-rose-100 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-300'}`}>
                                            {state.locks_secured === true ? <Check size={20} strokeWidth={4} /> : state.locks_secured === false ? <X size={20} strokeWidth={4} /> : <Lock size={20} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 right-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:pl-64 transition-all">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-4 md:items-center">
                    <div className="w-full md:w-1/3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                            <span className="text-slate-400">Progress</span>
                            <span className={isComplete ? 'text-emerald-600' : 'text-slate-600'}>{completedChecks}/{totalAnimals}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                    <div className="flex-1 flex gap-3">
                        <input type="text" placeholder="Initials" value={signingInitials} onChange={e => setSigningInitials(e.target.value.toUpperCase())} maxLength={3} className="w-20 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-black focus:outline-none focus:border-emerald-500" />
                        <button disabled={!isComplete || !signingInitials} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            <ShieldCheck size={18} /> Sign Off
                        </button>
                    </div>
                </div>
            </div>

            {reportModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="font-black text-lg uppercase tracking-tight text-slate-800 flex items-center gap-2">
                                {reportType === 'HEALTH' ? <Heart className="text-rose-500" /> : <Lock className="text-rose-500" />}
                                Report Issue
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea autoFocus value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Describe the issue..." className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-sm h-32 focus:outline-none focus:border-rose-500 transition-colors" />
                            <div className="flex gap-3">
                                <button onClick={() => setReportModalOpen(false)} className="flex-1 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                <button onClick={confirmIssue} disabled={!issueText} className="flex-1 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50 bg-rose-600 hover:bg-rose-700 transition-colors">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}