import { createRootRoute, Outlet, useLocation, Link, Navigate } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { db } from '../lib/db';
import { useSyncStore } from '../store/syncStore';
import { useAuthStore } from '../store/authStore';
import { ClockInOutButton } from '../features/timesheets/components/ClockInOutButton';
import { 
  Activity, FileText, Pill, ShieldAlert, CalendarClock, Wrench, 
  HeartPulse, AlertTriangle, Flame, Loader2, ShieldCheck, Wifi, 
  WifiOff, RefreshCw, LogOut, LayoutDashboard, ClipboardList, 
  CheckSquare, Utensils, Clock
} from 'lucide-react';

export const routeRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

export const rootRoute = routeRoute;

function RootComponent() {
  const location = useLocation();
  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ZUSTAND LAW: Strict selectors
  const session = useAuthStore(s => s.session);
  const signOut = useAuthStore(s => s.signOut);
  
  // V2 SYNC ENGINE: Use the new shape subscription logic
  const { initSync, isSyncing, isOnline, syncErrors } = useSyncStore();

  useEffect(() => {
    async function boot() {
      try {
        await db.waitReady;
        setIsDbReady(true);
      } catch (err) {
        console.error("Critical DB Boot Failure:", err);
      }
    }
    boot();
  }, []);

  useEffect(() => {
    if (session?.access_token && isDbReady) {
      // Trigger the V2 HTTP Shape Stream
      initSync().catch(console.error);
    }
  }, [session, isDbReady, initSync]);

  if (!isDbReady) {
    return (
      <div className="h-screen w-full bg-[#0A0B0E] flex flex-col items-center justify-center text-emerald-400 font-mono z-50 fixed inset-0">
        <Loader2 className="animate-spin mb-4 text-emerald-500" size={48} />
        <span className="tracking-widest uppercase text-xs font-bold text-white">Initializing PGlite Clinical Vault...</span>
      </div>
    );
  }

  const isLoginPage = location.pathname === '/login';

  if (!session && !isLoginPage) {
    return <Navigate to="/login" />;
  }

  if (session && isLoginPage) {
    return <Navigate to="/" />;
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#0A0B0E]">
        <Toaster position="top-center" />
        <Outlet />
      </div>
    );
  }

  const ActiveLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
    <Link 
      to={to} 
      activeProps={{ className: "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" }} 
      inactiveProps={{ className: "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent" }} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isSidebarOpen ? '' : 'justify-center'}`} 
      title={!isSidebarOpen ? label : undefined}
    >
      <div className="shrink-0">{icon}</div>
      {isSidebarOpen && <span className="text-sm font-semibold truncate">{label}</span>}
    </Link>
  );

  return (
    <div className="flex h-screen w-full bg-[#0A0B0E] font-sans text-slate-300 overflow-hidden">
      <Toaster position="top-center" toastOptions={{ className: 'text-sm font-bold shadow-2xl border border-slate-800', style: { background: '#111827', color: '#fff' } }} />
      
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} flex-shrink-0 flex flex-col border-r border-slate-800/60 transition-all duration-300 bg-[#0A0B0E]`}>
        <div className="flex items-center justify-center h-16 px-4 bg-[#0A0B0E] border-b border-slate-800/40 shrink-0">
          <h1 className={`font-black tracking-tighter text-white transition-all ${isSidebarOpen ? 'text-xl' : 'text-lg text-emerald-500'}`}>
            {isSidebarOpen ? 'KOA MANAGER' : 'KM'}
          </h1>
        </div>
        
        <nav className="flex-1 py-6 overflow-y-auto px-3 space-y-6 scrollbar-hide">
          {/* Collection */}
          <section>
            {isSidebarOpen && <label className="px-4 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase block mb-3">Collection</label>}
            <ActiveLink to="/" label="Dashboard" icon={<LayoutDashboard size={20} />} />
          </section>

          {/* Husbandry */}
          <section>
            {isSidebarOpen && <label className="px-4 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase block mb-3">Husbandry</label>}
            <div className="space-y-1">
              <ActiveLink to="/daily-logs" label="Daily Logs" icon={<FileText size={20} />} />
              <ActiveLink to="/daily-rounds" label="Daily Rounds" icon={<ClipboardList size={20} />} />
              <ActiveLink to="/tasks" label="Tasks" icon={<CheckSquare size={20} />} />
              <ActiveLink to="/feeding-schedules" label="Feeding Schedule" icon={<Utensils size={20} />} />
            </div>
          </section>

          {/* Veterinary & Health */}
          <section>
            {isSidebarOpen && <label className="px-4 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase block mb-3">Veterinary & Health</label>}
            <div className="space-y-1">
              <ActiveLink to="/medical" label="Medical Dashboard" icon={<Activity size={20} />} />
              <ActiveLink to="/medical/records" label="Clinical Records" icon={<HeartPulse size={20} />} />
              <ActiveLink to="/medical/medications" label="Medication Logs" icon={<Pill size={20} />} />
              <ActiveLink to="/medical/isolation" label="Biosecurity" icon={<ShieldAlert size={20} />} />
              <ActiveLink to="/medical/schedule" label="Medical Schedule" icon={<CalendarClock size={20} />} />
            </div>
          </section>

          {/* Safety & Compliance */}
          <section>
            {isSidebarOpen && <label className="px-4 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase block mb-3">Safety & Compliance</label>}
            <div className="space-y-1">
              <ActiveLink to="/maintenance" label="Maintenance" icon={<Wrench size={20} />} /> 
              <ActiveLink to="/incidents" label="First Aid" icon={<HeartPulse size={20} />} /> 
              <ActiveLink to="/safety-incidents" label="Safety Incidents" icon={<AlertTriangle size={20} />} />
              <ActiveLink to="/fire-drills" label="Fire Drills" icon={<Flame size={20} />} />
            </div>
          </section>

          {/* Staff Management */}
          <section>
            {isSidebarOpen && <label className="px-4 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase block mb-3">Staff Management</label>}
            <ActiveLink to="/timesheets" label="Timesheets" icon={<Clock size={20} />} />
          </section>
        </nav>

        <div className="p-4 border-t border-slate-800/40 space-y-2 shrink-0">
          <button 
            onClick={() => signOut()} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all ${isSidebarOpen ? '' : 'justify-center'}`}
            title={!isSidebarOpen ? "Logout" : undefined}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-bold">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <svg className={`w-5 h-5 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            
            {/* Status Indicator bound directly to V2 properties */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider">
              {syncErrors.length > 0 ? (
                <><AlertTriangle size={12} className="text-rose-500" /> <span className="text-rose-600">Error</span></>
              ) : isSyncing ? (
                <><RefreshCw size={12} className="text-amber-500 animate-spin" /> <span className="text-amber-600">Syncing</span></>
              ) : isOnline ? (
                <><Wifi size={12} className="text-emerald-500" /> <span className="text-emerald-600">Live</span></>
              ) : (
                <><WifiOff size={12} className="text-slate-400" /> <span className="text-slate-400">Offline</span></>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ClockInOutButton />
            <div className="h-8 w-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-xs shadow-sm">
              {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-[#0A0B0E] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-[40px] shadow-2xl max-w-sm w-full">
        <AlertTriangle size={60} className="text-rose-500 mx-auto mb-6" />
        <h1 className="text-4xl font-black text-white mb-2">404</h1>
        <p className="text-slate-400 font-medium mb-