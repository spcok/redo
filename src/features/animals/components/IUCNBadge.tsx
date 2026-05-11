import React from 'react';

export function IUCNBadge({ status }: { status: string }) {
    const getBadgeStyle = (s: string) => {
        const code = s.toUpperCase();
        switch (code) {
            case 'EX': return 'bg-black text-rose-500 border-black'; // Extinct
            case 'EW': return 'bg-purple-900 text-white border-purple-950'; // Extinct in Wild
            case 'CR': return 'bg-rose-600 text-white border-rose-700'; // Critically Endangered
            case 'EN': return 'bg-orange-500 text-white border-orange-600'; // Endangered
            case 'VU': return 'bg-amber-400 text-amber-900 border-amber-500'; // Vulnerable
            case 'NT': return 'bg-lime-400 text-lime-900 border-lime-500'; // Near Threatened
            case 'LC': return 'bg-emerald-500 text-white border-emerald-600'; // Least Concern
            case 'DD': return 'bg-slate-300 text-slate-700 border-slate-400'; // Data Deficient
            case 'NE': return 'bg-slate-100 text-slate-500 border-slate-200'; // Not Evaluated
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    return (
        <span 
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border shadow-sm ${getBadgeStyle(status)}`}
            title={`IUCN Red List Status: ${status.toUpperCase()}`}
        >
            {status.toUpperCase()}
        </span>
    );
}