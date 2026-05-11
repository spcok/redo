import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { z } from 'zod';
import { 
    Loader2, Plus, Trash2, Activity, FileText, Pill, 
    Stethoscope, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';

// ==========================================
// AUDIT POINT O-01 & R-01: Zod Edge + SQL Joins
// Defines the exact shape expected from the clinical_records table.
// ==========================================
const ClinicalRecordSchema = z.object({
    id: z.string().uuid(),
    record_date: z.string(), // ISO String from PGlite
    record_type: z.string(), // e.g., 'Exam', 'Treatment', 'Surgery', 'Note'
    diagnosis: z.string().nullable(),
    treatment: z.string().nullable(),
    notes: z.string().nullable(),
    is_resolved: z.boolean().default(false),
    vet_initials: z.string().nullable(), // Derived from a JOIN (Stubbed for now)
});

type ClinicalRecord = z.infer<typeof ClinicalRecordSchema>;

const PAGE_SIZE = 10;

export function MedicalTab({ animalId }: { animalId: string }) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);

    // 1. Fetch Paginated Clinical Records
    const { data, isLoading } = useQuery({
        queryKey: ['clinical-records', animalId, page],
        queryFn: async () => {
            await db.waitReady;
            
            // SQL-Side Pagination to prevent DOM-Crush
            // Using a resilient schema fallback in case the table doesn't exist yet in your local vault
            try {
                const res = await db.query(`
                    SELECT 
                        id, record_date, record_type, diagnosis, treatment, notes, is_resolved,
                        'Vet' as vet_initials /* Stub for JOIN */
                    FROM clinical_records 
                    WHERE animal_id = $1 AND is_deleted = false
                    ORDER BY record_date DESC, created_at DESC
                    LIMIT $2 OFFSET $3
                `, [animalId, PAGE_SIZE, page * PAGE_SIZE]);

                const countRes = await db.query(`
                    SELECT COUNT(*) as total FROM clinical_records WHERE animal_id = $1 AND is_deleted = false
                `, [animalId]);

                const total = Number(countRes.rows[0]?.total || 0);

                return {
                    records: z.array(ClinicalRecordSchema).parse(res.rows),
                    totalCount: total,
                    totalPages: Math.ceil(total / PAGE_SIZE)
                };
            } catch (err: any) {
                // Failsafe if clinical_records table isn't in db.ts yet
                if (err.message.includes('does not exist')) {
                    return { records: [], totalCount: 0, totalPages: 0 };
                }
                throw err;
            }
        }
    });

    // 2. Optimistic Delete Mutation (Stuttering Trash Can Fix)
    const deleteMutation = useMutation({
        mutationFn: async (recordId: string) => {
            await db.waitReady;
            await db.query(`UPDATE clinical_records SET is_deleted = true, updated_at = now() WHERE id = $1`, [recordId]);
        },
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: ['clinical-records', animalId, page] });
            const previousData = queryClient.getQueryData(['clinical-records', animalId, page]);
            
            queryClient.setQueryData(['clinical-records', animalId, page], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    records: old.records.filter((rec: ClinicalRecord) => rec.id !== deletedId)
                };
            });
            return { previousData };
        },
        onError: (err, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['clinical-records', animalId, page], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['clinical-records', animalId] });
        }
    });

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t === 'exam') return <Stethoscope size={14} className="text-indigo-500" />;
        if (t === 'treatment' || t === 'medication') return <Pill size={14} className="text-rose-500" />;
        if (t === 'surgery') return <Activity size={14} className="text-amber-500" />;
        return <FileText size={14} className="text-slate-500" />;
    };

    if (isLoading) return <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>;

    const records = data?.records || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Activity size={18} className="text-indigo-500" /> Clinical History
                </h3>
                <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus size={14} /> Add Record
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {records.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <Stethoscope size={48} className="mb-4 opacity-20" />
                        <p className="font-bold text-sm">No clinical records found.</p>
                        <p className="text-xs mt-1 opacity-70">This animal has a clean bill of health.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Date</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Type & Status</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Diagnosis / Treatment</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Staff</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map((record) => (
                                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-sm text-slate-800">{new Date(record.record_date).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                                                {getIcon(record.record_type)} {record.record_type}
                                            </span>
                                            {record.is_resolved ? (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600"><CheckCircle2 size={12}/> Resolved</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600"><AlertTriangle size={12}/> Active Issue</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1 text-sm">
                                            {record.diagnosis && <span className="font-bold text-slate-800">Dx: <span className="font-normal text-slate-600">{record.diagnosis}</span></span>}
                                            {record.treatment && <span className="font-bold text-slate-800">Tx: <span className="font-normal text-slate-600">{record.treatment}</span></span>}
                                            {(!record.diagnosis && !record.treatment && record.notes) && <span className="text-slate-500 italic max-w-xs truncate">{record.notes}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100" title="Veterinarian">
                                            {record.vet_initials}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => window.confirm("Void this clinical record? This should only be done for erroneous entries.") && deleteMutation.mutate(record.id)}
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
        </div>
    );
}