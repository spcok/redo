import React from 'react';
import { X, Printer, AlertTriangle } from 'lucide-react';
import { IUCNBadge } from './IUCNBadge';

interface SignGeneratorProps {
    animal: {
        name?: string | null;
        species?: string | null;
        latin_name?: string | null;
        red_list_status: string;
        is_venomous?: boolean;
        date_of_birth?: string | null;
    };
    onClose: () => void;
    // We stub orgProfile for Phase 1. In Phase 4, we will pass this from a global Settings store.
    orgProfile?: any; 
}

export function SignGenerator({ animal, onClose }: SignGeneratorProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex flex-col md:flex-row">
            {/* Left Sidebar: Controls (Hidden during print) */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col print:hidden shadow-2xl z-10">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="font-black uppercase tracking-tight text-slate-800">Print Center</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-indigo-700 text-sm">
                        <p className="font-bold mb-1">Print Settings</p>
                        <p className="opacity-80 text-xs">For best results, set your printer to <strong>Landscape</strong> layout and disable "Headers and Footers" in your browser's print dialog.</p>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button 
                        onClick={handlePrint} 
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Printer size={18} /> Print Signage
                    </button>
                </div>
            </div>

            {/* Right Side: The Print Preview Canvas */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-200/50 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
                
                {/* The actual Sign (A4 Landscape aspect ratio roughly) */}
                <div className="w-full max-w-[1056px] aspect-[1.414/1] bg-white shadow-2xl print:shadow-none print:w-full print:max-w-none print:h-screen print:aspect-auto border-8 border-slate-900 flex flex-col relative overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className="h-32 bg-slate-900 flex items-center justify-between px-12 shrink-0">
                        <h1 className="text-white text-6xl font-black uppercase tracking-tighter">{animal.name || 'Animal Profile'}</h1>
                        {/* Placeholder for future Org Logo */}
                        <div className="w-20 h-20 bg-white/10 rounded-full border border-white/20 flex items-center justify-center">
                            <span className="text-white/50 font-black text-xs uppercase tracking-widest">Logo</span>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-12 flex gap-12">
                        
                        {/* Left Col: Photo & Core Data */}
                        <div className="w-1/3 flex flex-col gap-8">
                            <div className="w-full aspect-square bg-slate-100 border-4 border-slate-200 rounded-3xl overflow-hidden flex items-center justify-center shadow-inner">
                                <img 
                                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${animal.name || animal.species}&backgroundColor=e2e8f0`} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover opacity-50"
                                />
                            </div>

                            <div className="space-y-4">
                                {animal.is_venomous && (
                                    <div className="bg-rose-100 border-2 border-rose-600 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 font-black uppercase tracking-widest text-lg">
                                        <AlertTriangle size={24} /> Danger: Venomous
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Conservation Status</p>
                                    <div className="scale-150 origin-left"><IUCNBadge status={animal.red_list_status} /></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Details */}
                        <div className="w-2/3 flex flex-col gap-6 pt-4">
                            <div>
                                <h2 className="text-5xl font-black text-slate-800 uppercase tracking-tight mb-2">{animal.species || 'Unknown Species'}</h2>
                                <h3 className="text-2xl font-bold text-slate-400 italic">({animal.latin_name || 'Classification Pending'})</h3>
                            </div>

                            <div className="h-1 w-24 bg-emerald-500 rounded-full my-4"></div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-8 mt-4">
                                <div>
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Year of Birth</p>
                                    <p className="text-2xl font-bold text-slate-700">
                                        {animal.date_of_birth ? new Date(animal.date_of_birth).getFullYear() : 'Unknown'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Strip */}
                    <div className="h-16 bg-slate-100 border-t border-slate-200 px-12 flex items-center justify-between shrink-0">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Internal Clinical Record • Not for public distribution</p>
                        <p className="text-slate-400 font-bold text-xs">Generated: {new Date().toLocaleDateString()}</p>
                    </div>

                </div>
            </div>

            {/* Global Print Styles (Injected securely) */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\\:visible, .print\\:visible * { visibility: visible; }
                    .print\\:hidden { display: none !important; }
                    @page { size: landscape; margin: 0; }
                }
            `}</style>
        </div>
    );
}