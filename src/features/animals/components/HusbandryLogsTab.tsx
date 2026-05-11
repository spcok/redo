import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { z } from 'zod';
import { 
    Loader2, Plus, Trash2, ShieldAlert, Droplets, Utensils, 
    Thermometer, Weight, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';

// You will import this from the global feature, not an embedded one!
// import { DailyLogModal } from '../../daily-logs/components/DailyLogModal';

// ==========================================
// AUDIT POINT O-01 & R-01: Zod Edge + SQL Joins
// We define the exact shape of the JOINED query.
// ==========================================
const LogRowSchema = z.object({
    id: z.string().uuid(),
    log_type: z.string(),
    log_date: z.string(), // PGlite returns dates as ISO strings
    notes: z.string().nullable(),
    weight_grams: z.preprocess(v => v === null ? null : Number(v), z.number().nullable()),
    temperature_c: z.preprocess(v => v === null ? null : Number(v), z.number().nullable()),
    user_initials: z.string().nullable(), // Derived from a JOIN (if users table existed, stubbed for now)
});

type LogRow = z.infer<typeof LogRowSchema>;

const PAGE_SIZE = 15;

export function HusbandryLogsTab({ animalId }: { animalId: string }) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // 1. Fetch Paginated Logs safely
    const { data, isLoading } = useQuery({
        queryKey: ['animal-logs', animalId, page],
        queryFn: async () => {
            await db.waitReady;
            
            // Audit R-01: Pagination strictly enforced in SQL to prevent DOM-Crush
            const res = await db.query(`
                SELECT 
                    id, log_type, log_date, notes, weight_grams, temperature_c,
                    'Kpr' as user_initials /* Stub: Replace with real JOIN when users table is migrated */
                FROM daily_logs 
                WHERE animal_id = $1 AND is_deleted = false
                ORDER BY log_date DESC, created_at DESC
                LIMIT $2 OFFSET $3
            `, [animalId, PAGE_SIZE, page * PAGE_SIZE]);

            const countRes = await db.query(`
                SELECT COUNT(*) as total FROM daily_logs WHERE animal_id = $1 AND is_deleted = false
            `, [animalId]);

            const total = Number(countRes.rows[0]?.total || 0);

            // Audit O-01: Zod Edge Parsing
            return {
                logs: z.array(LogRowSchema).parse(res.rows),
                totalCount: total,
                totalPages: Math.ceil(total / PAGE_SIZE)
            };
        }
    });

    // 2. Optimistic Delete Mutation (Stuttering Trash Can Fix)
    const deleteMutation = useMutation({
        mutationFn: async (logId: string) => {
            await db.waitReady;
            await db.query(`UPDATE daily_logs SET is_deleted = true, updated_at = now() WHERE id = $1`, [logId]);
        },
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: ['animal-logs', animalId, page] });
            const previousData = queryClient.getQueryData(['animal-logs', animalId, page]);
            
            // Instantly hide the row in the UI
            queryClient.setQueryData(['animal-logs', animalId, page], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    logs: old.logs.filter((log: LogRow) => log.id !== deletedId)
                };
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['animal-logs', animalId, page], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['animal-logs', animalId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        }
    });

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'feed') return <Utensils size={14} className="text-amber-500" />;
        if (t === 'water' || t === 'mist') return <Droplets size={14} className="text-blue-500" />;
        if (t === 'weight') return <Weight size={14} className="text-emerald-500" />;
        if (t === 'temp' || t === 'uvb') return <Thermometer size={14} className="text-orange-500" />;
        return <FileText size={14} className="text-slate-500" />;
    };

    if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>;

    const logs = data?.logs || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Husbandry History</h3>
                <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-sm">
                    <Plus size={14} /> Add Log
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="font-bold text-sm">No husbandry records found.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Date & Time</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Type</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Metrics</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Notes</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Staff</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-sm text-slate-800">{new Date(log.log_date).toLocaleDateString()}</div>
                                        <div className="text-xs text-slate-400 font-medium">{new Date(log.log_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                                            {getIcon(log.log_type)} {log.log_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {log.weight_grams !== null && <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-100">{log.weight_grams}g</span>}
                                            {log.temperature_c !== null && <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded w-fit border border-orange-100">{log.temperature_c}°C</span>}
                                            {log.weight_grams === null && log.temperature_c === null && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={log.notes || ''}>
                                        {log.notes || <span className="text-slate-300 italic">No notes provided</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black border border-slate-200" title="Keeper">
                                            {log.user_initials}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => window.confirm("Void this log?") && deleteMutation.mutate(log.id)}
                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Void Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, data?.totalCount || 0)} of {data?.totalCount}</span>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30"><ChevronLeft size={16}/></button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded disabled:opacity-30"><ChevronRight size={16}/></button>
                    </div>
                </div>
            )}

            {/* In a real environment, uncomment the DailyLogModal import and use it here */}
            {/* {isAddModalOpen && <DailyLogModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} preselectedAnimalId={animalId} />} */}
        </div>
    );
}