import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'react-hot-toast';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Loader2, 
  ChevronRight, 
  Database,
  Fingerprint
} from 'lucide-react';

// Strict validation for clinical access
const loginSchema = z.object({
  email: z.string().email('Valid institutional email required'),
  password: z.string().min(8, 'Security policy requires at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Step 1: Handshake with Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      if (authData.session) {
        // Step 2: Update the Auth Store with the real JWT
        // This will automatically trigger the Sync Engine in __root.tsx
        setSession({
          user: {
            id: authData.session.user.id,
            email: authData.session.user.email,
          },
          access_token: authData.session.access_token,
        });

        toast.success('Identity Verified: Sync Active');
        navigate({ to: '/' });
      }
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      toast.error(error.message || 'Verification failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] perspective-1000">
      <div className="relative group">
        {/* Subtle Glow Backdrop */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        
        <div className="relative bg-[#0F1115] border border-slate-800/60 rounded-3xl p-10 shadow-2xl overflow-hidden">
          
          {/* Header Branding */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
              <ShieldCheck size={32} className="text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
              KOA <span className="text-emerald-500">Manager</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Clinical Data Vault Access
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                Authorized Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="name@institution.com"
                />
              </div>
              {errors.email && (
                <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wide ml-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Security Key
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="••••••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-rose-400 text-[10px] font-bold uppercase tracking-wide ml-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group mt-8 overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold uppercase text-xs tracking-[0.2em] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Decrypt & Sync</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-800/50 pt-8">
            <div className="flex items-center gap-2 text-slate-500">
              <Database size={14} />
              <span className="text-[10px] uppercase font-bold tracking-tighter">
                Electric Sync Protocol v3.1 Enabled
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Fingerprint size={14} />
              <span className="text-[10px] font-medium italic">
                Device Fingerprint Recorded for Compliance
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};