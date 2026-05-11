import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { useAuthStore } from '../../../store/authStore';
import { Edit, Trash2, Printer, RotateCcw, Loader2 } from 'lucide-react';

// Strict Partial Type to satisfy the Type Law (No 'as any' allowed)
interface Props {
    animal: {
        id: string;
        is_deleted?: boolean;
        name?: string | null;
        archived?: boolean; // Included for legacy support compatibility
    };
    onEdit: () => void;
    onSign: () => void;
}

export function ProfileActionBar({ animal, onEdit, onSign }: Props) {
    const queryClient = useQueryClient();
    const session = useAuthStore(s => s.session);
    const currentUserId = session?.user?.id || '00000000-0000-0000-0000-000000000000';

    // Obeys Database Law: Strict db.query execution
    const toggleStatusMutation = useMutation({
        mutationFn: async (newStatus: boolean) => {
            await db.waitReady;
            await db.query(
                `UPDATE animals SET is_deleted = $1, modified_by = $2 WHERE id = $3`,
                [newStatus, currentUserId, animal.id]
            );
        },
        onMutate: async (newStatus) => {
            await queryClient.cancelQueries({ queryKey: ['animal-profile', animal.id] });
            const previousAnimal = queryClient.getQueryData(['animal-profile', animal.id]);
            
            queryClient.setQueryData(['animal-profile', animal.id], (old: any) => {
                if (!old) return old;
                return { ...old, is_deleted: newStatus };
            });
            
            return { previousAnimal };
        },
        onError: (err, newStatus, context) => {
            if (context?.previousAnimal) {
                queryClient.setQueryData(['animal-profile', animal.id], context.previousAnimal);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['animal-profile', animal.id] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            queryClient.invalidateQueries({ queryKey: ['animals-list'] });
        }
    });

    const isDeleted = animal.is_deleted === true || animal.archived === true;

    return (
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
            <button 
                onClick={onSign} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm"
            >
                <Printer size={14} /> Signage
            </button>
            
            <button 
                onClick={onEdit} 
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-colors shadow-sm"
            >
                <Edit size={14} /> Edit
            </button>
            
            {isDeleted ? (
                <button 
                    onClick={() => {
                        if (window.confirm(`Reactivate ${animal.name || 'this animal'}?`)) {
                            toggleStatusMutation.mutate(false);
                        }
                    }}
                    disabled={toggleStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50"
                >
                    {toggleStatusMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                    Restore
                </button>
            ) : (
                <button 
                    onClick={() => {
                        if (window.confirm(`Archive ${animal.name || 'this animal'}? They will be removed from active dashboards.`)) {
                            toggleStatusMutation.mutate(true);
                        }
                    }}
                    disabled={toggleStatusMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-rose-100 transition-colors shadow-sm disabled:opacity-50"
                >
                    {toggleStatusMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} 
                    Archive
                </button>
            )}
        </div>
    );
}