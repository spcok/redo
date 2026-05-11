import React, { useState, useMemo } from 'react';
import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import { DailyLogModal } from '../features/daily-logs/components/DailyLogModal';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/daily-logs',
  component: DailyLogsPage,
});

type ProcessedAnimal = {
  id: string;
  name: string | null;
  species: string | null;
  census_count: number | null;
  todayWeight: number | null;
  fedToday: boolean;
  mistedToday: boolean;
  tempToday: number | null;
};

const TABS = ['OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'];

function DailyLogsPage() {
  const [activeTab, setActiveTab] = useState('OWLS');
  const [viewingDate, setViewingDate] = useState(new Date());
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [modalType, setModalType] = useState('general');

  const dateStr = viewingDate.toISOString().split('T')[0];
  const displayDate = viewingDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const shiftDate = (days: number) => {
    const newDate = new Date(viewingDate);
    newDate.setDate(newDate.getDate() + days);
    setViewingDate(newDate);
  };

  const { data: tableData = [], isLoading } = useQuery({
    queryKey: ['daily-logs-page', dateStr, activeTab],
    queryFn: async () => {
      await db.waitReady;
      
      const animalsRes = await db.query(
        "SELECT id, name, species, census_count FROM animals WHERE category ILIKE $1 AND is_deleted = false ORDER BY display_order ASC, name ASC",
        [activeTab]
      );
      
      const logsRes = await db.query(
        "SELECT animal_id, log_type, weight_grams, temperature_c FROM daily_logs WHERE log_date::date = $1::date AND is_deleted = false",
        [dateStr]
      );

      return animalsRes.rows.map((a: any) => {
        const myLogs = logsRes.rows.filter((l: any) => l.animal_id === a.id);
        const weightLog = myLogs.find((l: any) => l.log_type === 'weight');
        const feedLog = myLogs.find((l: any) => l.log_type === 'feed');
        const mistLog = myLogs.find((l: any) => l.log_type === 'misting');
        const tempLog = myLogs.find((l: any) => l.log_type === 'temperature');

        return {
          id: a.id,
          name: a.name || 'Unnamed',
          species: a.species || 'Unknown Species',
          census_count: a.census_count,
          todayWeight: weightLog ? Number(weightLog.weight_grams) : null,
          fedToday: !!feedLog,
          mistedToday: !!mistLog,
          tempToday: tempLog ? Number(tempLog.temperature_c) : null,
        } as ProcessedAnimal;
      });
    }
  });

  const openModal = (animalId: string, type: string) => {
    setSelectedAnimalId(animalId);
    setModalType(type);
    setModalOpen(true);
  };

  const columnHelper = createColumnHelper<ProcessedAnimal>();
  
  const columns = useMemo(() => {
    const baseCols = [
      columnHelper.accessor('name', {
        id: 'animal',
        header: 'ANIMAL',
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${info.getValue()}&backgroundColor=e2e8f0&textColor=475569`} alt="avatar" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {info.getValue()}
                {info.row.original.census_count !== null && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                    Group Record (Census: {info.row.original.census_count})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">{info.row.original.species}</div>
            </div>
          </div>
        ),
      })
    ];

    if (activeTab === 'EXOTICS') {
      baseCols.push(
        columnHelper.display({
          id: 'feed',
          header: 'FEED',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'feed')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors ${row.original.fedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}>
              {row.original.fedToday ? 'Fed ✓' : 'Feed'}
            </button>
          )
        }),
        columnHelper.display({
          id: 'misting',
          header: 'MISTING',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'misting')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors ${row.original.mistedToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>
              {row.original.mistedToday ? 'Misted ✓' : 'Mist'}
            </button>
          )
        }),
        columnHelper.display({
          id: 'env',
          header: 'ENV',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'temperature')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors border ${row.original.tempToday ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'}`}>
              {row.original.tempToday ? `${row.original.tempToday}°C` : 'ADD TEMPS'}
            </button>
          )
        })
      );
    } else {
      baseCols.push(
        columnHelper.display({
          id: 'wt',
          header: 'WT',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'weight')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors ${row.original.todayWeight ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {row.original.todayWeight ? `${row.original.todayWeight}g` : '--'}
            </button>
          )
        }),
        columnHelper.display({
          id: 'feed',
          header: 'FEED',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'feed')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors ${row.original.fedToday ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'}`}>
              {row.original.fedToday ? 'Fed ✓' : 'Feed'}
            </button>
          )
        }),
        columnHelper.display({
          id: 'env',
          header: 'ENV',
          cell: ({ row }) => (
            <button onClick={() => openModal(row.original.id, 'temperature')} className={`w-32 py-1.5 rounded-full text-xs font-bold transition-colors border border-transparent ${row.original.tempToday ? 'bg-amber-50 text-amber-700' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}>
              {row.original.tempToday ? `${row.original.tempToday}°C` : '--'}
            </button>
          )
        })
      );
    }
    return baseCols;
  }, [activeTab]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Daily Log</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Log and track daily animal activities.</p>
        
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button onClick={() => shiftDate(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={16}/></button>
            <div className="px-3 text-sm font-bold text-slate-700 flex items-center gap-2">
              <CalendarIcon size={14} className="text-slate-400"/> {displayDate}
            </div>
            <button onClick={() => shiftDate(1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={16}/></button>
          </div>
          <button onClick={() => setViewingDate(new Date())} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wider">
            Today
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 text-xs font-black tracking-widest rounded-t-xl transition-colors ${
                activeTab === tab 
                  ? 'bg-white text-blue-600 border-t border-l border-r border-slate-200 shadow-[0_4px_0_0_white]' 
                  : 'text-slate-500 hover:bg-slate-100/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-indigo-100">
          Sub-Accounts Hidden
        </button>
      </div>

      <div className="bg-white rounded-b-2xl rounded-tr-2xl border border-slate-200 shadow-sm overflow-hidden -mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">Loading animals...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-medium">No animals found in this category.</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DailyLogModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        animalId={selectedAnimalId}
        initialType={modalType}
      />
    </div>
  );
}