import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { Loader2, Stethoscope, ShieldAlert, CalendarClock, Pill } from 'lucide-react';
import { Link } from '@tanstack/react-router';

// ==========================================
// STRICT TYPES (Type Law)
// ==========================================
interface DBClinicalSchedule {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  frequency: string;
  animal_id: string;
  animal_name: string | null;
  species: string | null;
}

interface DBIsolationLog {
  id: string;
  isolation_type: string;
  location: string;
  animal_id: string;
  animal_name: string | null;
  species: string | null;
}

interface DBClinicalRecord {
  id: string;
  record_type: string;
  record_date: string;
  diagnosis: string | null;
  animal_id: string;
  animal_name: string | null;
}

export function MedicalDashboardView() {
  const { data, isLoading } = useQuery({
    queryKey: ['medical_dashboard_data'],
    queryFn: async () => {
      await db.waitReady;
      
      let schedulesRes = { rows: [] as DBClinicalSchedule[] };
      let isolationsRes = { rows: [] as DBIsolationLog[] };
      let recordsRes = { rows: [] as DBClinicalRecord[] };

      try {
        schedulesRes = await db.query(`
          SELECT c.id, c.title, c.start_date, c.end_date, c.frequency, c.animal_id, a.name as animal_name, a.species 
          FROM clinical_schedule c 
          LEFT JOIN animals a ON c.animal_id = a.id 
          WHERE c.status = 'ACTIVE' AND c.is_deleted = false 
          ORDER BY c.start_date ASC LIMIT 5
        `) as { rows: DBClinicalSchedule[] };
        
        isolationsRes = await db.query(`
          SELECT i.id, i.isolation_type, i.location, i.animal_id, a.name as animal_name, a.species 
          FROM isolation_logs i 
          LEFT JOIN animals a ON i.animal_id = a.id 
          WHERE i.status = 'ACTIVE' AND i.is_deleted = false
        `) as { rows: DBIsolationLog[] };

        recordsRes = await db.query(`
          SELECT c.id, c.record_type, c.record_date, c.diagnosis, c.animal_id, a.name as animal_name 
          FROM clinical_records c 
          LEFT JOIN animals a ON c.animal_id = a.id 
          WHERE c.is_deleted = false 
          ORDER BY c.record_date DESC LIMIT 5
        `) as { rows: DBClinicalRecord[] };
      } catch (err) {
        console.warn("Supporting tables missing, defaulting to empty arrays.");
      }

      return {
        schedules: schedulesRes.rows,
        isolations: isolationsRes.rows,
        records: recordsRes.rows
      };
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Stethoscope className="text-indigo-500" size={32}/> Medical Command
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Links */}
        <div className="col-span-1 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/medical/records" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><Stethoscope size={24}/></div>
            <span className="font-black text-xs uppercase tracking-widest text-slate-600">Clinical Records</span>
          </Link>
          <Link to="/medical/schedule" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><CalendarClock size={24}/></div>
            <span className="font-black text-xs uppercase tracking-widest text-slate-600">Active Schedules</span>
          </Link>
          <Link to="/medical/medications" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors"><Pill size={24}/></div>
            <span className="font-black text-xs uppercase tracking-widest text-slate-600">MAR Logs</span>
          </Link>
          <Link to="/medical/isolation" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors"><ShieldAlert size={24}/></div>
            <span className="font-black text-xs uppercase tracking-widest text-slate-600">Isolation Ward</span>
          </Link>
        </div>

        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2"><CalendarClock className="text-indigo-500" size={18}/> Active Treatments</h2>
              <Link to="/medical/schedule" className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800">View All</Link>
            </div>
            <div className="space-y-3">
              {data?.schedules.length === 0 ? (
                <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">No active treatments.</div>
              ) : (
                data?.schedules.map((sched) => (
                  <div key={sched.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{sched.title}</p>
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{sched.animal_name} <span className="text-slate-400">({sched.species})</span></p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase bg-white border px-2 py-1 rounded shadow-sm text-slate-600">{sched.frequency}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2"><ShieldAlert className="text-rose-500" size={18}/> Isolation Ward</h2>
              <Link to="/medical/isolation" className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-800">Manage</Link>
            </div>
            <div className="space-y-3">
              {data?.isolations.length === 0 ? (
                <div className="text-center py-6 text-slate-400 font-bold text-xs uppercase tracking-widest">Ward is empty.</div>
              ) : (
                data?.isolations.map((iso) => (
                  <div key={iso.id} className="bg-white border-2 border-rose-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                    <div className="pl-2 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to="/animals/$animalId" params={{ animalId: iso.animal_id }} className="font-black text-sm text-slate-800 hover:text-indigo-600 uppercase">{iso.animal_name}</Link>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{iso.species}</p>
                        </div>
                        <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-1 rounded shadow-sm">{iso.isolation_type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-xs text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border">
                        <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Location</span>{iso.location}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}