import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { db } from '../../lib/db';
import { useDashboardStore } from '../../store/dashboardStore';
import { 
  Heart, Scale, Drumstick, ArrowUpDown, Loader2, ClipboardCheck, 
  CheckCircle, Lock, Unlock, ChevronUp, ChevronDown, Calendar, 
  AlertTriangle, Search 
} from 'lucide-react';

interface DBAnimal {
  id: string;
  name: string | null;
  species: string | null;
  category: string | null;
  location: string | null;
  is_deleted: boolean;
  ring_number: string | null;
  microchip_id: string | null;
}

interface DBLog {
  animal_id: string;
  log_type: string;
  log_date: string;
  weight_grams: number | null;
}

interface DBSchedule {
  animal_id: string;
  next_feed_date: string;
  food_type: string;
}

interface EnhancedAnimal extends DBAnimal {
  todayWeight: number | null;
  fed_today: boolean;
  nextFeedTask: { dueDate: string; notes: string } | null;
}

export function Dashboard() {
  const navigate = useNavigate();

  const viewingDate = useDashboardStore(s => s.viewingDate);
  const activeTab = useDashboardStore(s => s.categoryFilter);
  const setActiveTab = useDashboardStore(s => s.setCategoryFilter);
  const sortOption = useDashboardStore(s => s.sortOrder);
  const cycleSort = useDashboardStore(s => s.toggleSortOrder);
  const shiftDate = useDashboardStore(s => s.shiftDate);
  const resetToToday = useDashboardStore(s => s.resetToToday);

  const [isBentoMinimized, setIsBentoMinimized] = useState(false);
  const [isOrderLocked, setIsOrderLocked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const dateStr = viewingDate.toISOString().split('T')[0];
  const displayDate = useMemo(() => viewingDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [viewingDate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardData', dateStr],
    queryFn: async () => {
      await db.waitReady;
      const animalsRes = await db.query("SELECT * FROM animals ORDER BY name ASC");
      let logsRes = { rows: [] as DBLog[] };
      let schedRes = { rows: [] as DBSchedule[] };

      try {
          logsRes = await db.query("SELECT animal_id, log_type, log_date, weight_grams FROM daily_logs WHERE log_date::text LIKE $1 || '%' AND is_deleted = false", [dateStr]) as { rows: DBLog[] };
          schedRes = await db.query("SELECT animal_id, next_feed_date, food_type FROM feeding_schedules WHERE is_deleted = false") as { rows: DBSchedule[] };
      } catch (err) {
          console.warn("Supporting tables missing, defaulting to empty stats.");
      }
      
      return { 
        animals: animalsRes.rows as DBAnimal[], 
        logs: logsRes.rows,
        schedules: schedRes.rows
      };
    }
  });

  // V3 PERFORMANCE: Memoized heavy array processing. Will NOT re-run on search typing.
  const processedAnimals = useMemo<EnhancedAnimal[]>(() => {
    if (!data) return [];
    return data.animals.map((a) => {
      const aLogs = data.logs.filter(l => String(l.animal_id) === String(a.id));
      const todayWeight = aLogs.find(l => String(l.log_type).toLowerCase() === 'weight');
      const fedToday = aLogs.some(l => String(l.log_type).toLowerCase() === 'feed');

      const aScheds = data.schedules.filter(s => String(s.animal_id) === String(a.id));
      aScheds.sort((s1, s2) => new Date(s1.next_feed_date).getTime() - new Date(s2.next_feed_date).getTime());
      const nextSched = aScheds[0] || null;

      return {
        ...a,
        name: a.name || 'Unnamed',
        species: a.species || 'Unknown',
        category: a.category || 'Other',
        location: a.location || null,
        is_deleted: a.is_deleted || false,
        todayWeight: todayWeight?.weight_grams || null,
        fed_today: fedToday,
        nextFeedTask: nextSched ? { dueDate: nextSched.next_feed_date, notes: nextSched.food_type } : null
      };
    });
  }, [data]);

  // V3 PERFORMANCE: Separated filter logic to allow instantaneous search updates
  const filteredAnimals = useMemo(() => {
    let result = processedAnimals.filter(a => {
      if (activeTab === 'ARCHIVED') return a.is_deleted === true;
      if (a.is_deleted) return false;
      if (activeTab === 'ALL') return true;

      const cat = a.category.toLowerCase();
      const tab = activeTab.toLowerCase();
      return cat === tab || cat + 's' === tab || cat === tab.slice(0, -1);
    });

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(lowerSearch));
    }

    result.sort((a, b) => {
      return sortOption === 'alpha-asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });

    return result;
  }, [processedAnimals, activeTab, searchTerm, sortOption]);

  const animalStats = useMemo(() => ({
      total: filteredAnimals.length,
      weighed: filteredAnimals.filter((a) => a.todayWeight !== null).length,
      fed: filteredAnimals.filter((a) => a.fed_today).length
  }), [filteredAnimals]);

  if (isError) {
    return (
      <div className="p-12 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-100 text-rose-600 rounded-full"><AlertTriangle size={32} /></div>
        <h2 className="text-xl font-bold text-slate-800">Vault Connection Error</h2>
        <p className="text-sm font-medium text-slate-500 max-w-md text-center bg-rose-50 p-4 rounded-lg border border-rose-200">
            {error instanceof Error ? error.message : 'Unknown database exception'}
        </p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-500">Connecting to Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20 bg-slate-50 min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dashboard</h1>
          <p className="text-slate-500 mt-0.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            {displayDate} <span className="text-slate-300">|</span> 🌤️ 14°C Partly Cloudy
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* V3 PERFORMANCE: Removed 'transition-all duration-300' to stop layout thrashing */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><ClipboardCheck size={18} /></div>
                      <h2 className="text-base font-black uppercase tracking-widest text-slate-800">Pending Duties</h2>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                          <div className="p-2 bg-emerald-50 rounded-full mb-2"><CheckCircle size={24} className="text-emerald-500 opacity-80"/></div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">All Duties Satisfied</p>
                      </div>
                  </div>
              )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsBentoMinimized(!isBentoMinimized)}>
                  <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Heart size={18} /></div>
                      <h2 className="text-base font-black uppercase tracking-widest text-slate-800">Health Rota</h2>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                      {isBentoMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
              </div>
              {!isBentoMinimized && (
                  <div className="mt-3 flex-1 overflow-y-auto max-h-48 pr-2 space-y-2 scrollbar-hide">
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                          <div className="p-2 bg-rose-50 rounded-full mb-2"><Heart size={24} className="text-rose-300 opacity-60"/></div>
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Collection Stable</p>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-[#0fa968] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-0.5">Weighed Today</div>
            <div className="text-xl lg:text-2xl font-black">{animalStats.weighed}<span className="text-xs lg:text-sm opacity-80">/{animalStats.total}</span></div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Scale size={20} className="text-white" /></div>
        </div>
        <div className="bg-[#f97316] rounded-xl p-4 text-white flex justify-between items-center shadow-sm">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-0.5">Fed Today</div>
            <div className="text-xl lg:text-2xl font-black">{animalStats.fed}<span className="text-xs lg:text-sm opacity-80">/{animalStats.total}</span></div>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Drumstick size={20} className="text-white" /></div>
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <div className="flex items-center gap-1.5 text-slate-700 font-black uppercase tracking-widest whitespace-nowrap text-[10px] lg:text-xs">
            <Calendar size={16} className="text-emerald-600" /> Viewing Date:
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => shiftDate(-1)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center uppercase tracking-widest transition-colors">← Prev</button>
            <div className="relative flex-1 sm:flex-none min-w-[120px] text-center font-bold text-slate-800 text-sm py-1.5">{dateStr}</div>
            <button onClick={() => shiftDate(1)} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center uppercase tracking-widest transition-colors">Next →</button>
            <button onClick={() => resetToToday()} className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 whitespace-nowrap flex-1 sm:flex-none text-center text-emerald-600 transition-colors">Today</button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-1.5 w-full pt-2 border-t border-slate-100">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={cycleSort} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 text-slate-700 bg-white min-w-[80px] transition-colors">
                <ArrowUpDown size={14} /> {sortOption === 'alpha-asc' ? 'A-Z' : 'Z-A'}
              </button>
              <button onClick={() => setIsOrderLocked(!isOrderLocked)} className={`shrink-0 p-1.5 border border-slate-200 rounded-lg transition-colors ${isOrderLocked ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {isOrderLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
        </div>
      </div>

      <div className="flex overflow-x-auto scrollbar-hide bg-slate-200 p-1 rounded-xl gap-0.5 sm:gap-1">
        {['ALL', 'OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat as any)}
            className={`flex-1 min-w-fit sm:min-w-[100px] py-2 px-2 sm:px-4 text-[11px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors whitespace-nowrap ${activeTab === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {cat}
          </button>
        ))}
        <button onClick={() => setActiveTab('ARCHIVED')} className={`shrink-0 sm:flex-1 min-w-[80px] sm:min-w-[100px] py-2 px-3 sm:px-4 text-[11px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-colors whitespace-nowrap ${activeTab === 'ARCHIVED' ? 'bg-rose-100 text-rose-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Archived</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50/80 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Name / Species</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Today's Weight</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Fed</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Next Feed</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hidden md:table-cell">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAnimals.map(animal => (
              <tr 
                key={animal.id} 
                onClick={() => navigate({ to: '/animals/$animalId', params: { animalId: animal.id } })}
                className="group hover:bg-slate-50/80 cursor-pointer" // V3 PERFORMANCE: Removed 'transition-colors' on high-volume table rows
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                       <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${animal.name || animal.species}&backgroundColor=e2e8f0`} alt={animal.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{animal.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{animal.species}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {animal.todayWeight ? (
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{animal.todayWeight}g</span>
                  ) : (
                    <span className="text-slate-300 font-bold text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {animal.fed_today ? (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-100 flex items-center w-fit gap-1"><CheckCircle size={12}/> Fed</span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 px-2 py-1 rounded-md border border-orange-100">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {animal.nextFeedTask ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                        {new Date(animal.nextFeedTask.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-tight truncate max-w-[150px]">
                        {animal.nextFeedTask.notes || 'Scheduled'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 font-bold text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs font-bold text-blue-500">{animal.location || 'Unknown'}</span>
                </td>
              </tr>
            ))}
            {filteredAnimals.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 bg-slate-50/50">
                  <Search size={32} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="font-black text-slate-700 uppercase tracking-widest mb-1">Vault is Empty</h3>
                  <p className="font-bold text-sm text-slate-400">Ensure the mock data has seeded correctly.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}