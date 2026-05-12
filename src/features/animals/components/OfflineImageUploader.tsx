import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle, X } from 'lucide-react';

interface OfflineImageUploaderProps {
  label: string;
  value: string | null | undefined;
  onChange: (base64: string) => void;
  icon: React.ReactNode;
}

export function OfflineImageUploader({ label, value, onChange, icon }: OfflineImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processImage = (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Browser denied Canvas 2D context.");

            ctx.drawImage(img, 0, 0, width, height);
            
            // Output as high-compression JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            onChange(dataUrl);
          } catch (err: any) {
            console.error("[Uploader] Canvas Error:", err);
            setErrorMsg(err.message || "Canvas compression failed.");
          } finally {
            setIsProcessing(false);
          }
        };

        img.onerror = () => {
          console.error("[Uploader] Image Decode Error. File might be unsupported.");
          setErrorMsg("Unsupported image format. Please use JPG or PNG.");
          setIsProcessing(false);
        };

        img.src = event.target?.result as string;
      };

      reader.onerror = () => {
        console.error("[Uploader] FileReader Error:", reader.error);
        setErrorMsg("Operating System blocked file read access.");
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("[Uploader] Unexpected Exception:", err);
      setErrorMsg("An unexpected critical error occurred.");
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
      <div className="flex justify-between items-center mb-4">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {value && (
          <button type="button" onClick={handleClear} className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1">
            <X size={12} /> Clear Image
          </button>
        )}
      </div>

      <div className="flex gap-6 items-center">
        <div className="w-32 h-32 bg-white rounded-2xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          )}
          {value ? <img src={value} className="w-full h-full object-cover" alt="Preview" /> : <div className="text-slate-300">{icon}</div>}
        </div>
        
        <div className="flex-1 space-y-3">
          <input 
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processImage(e.target.files[0]);
              }
            }} 
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-sm font-bold text-slate-700 transition-colors disabled:opacity-50"
          >
            <UploadCloud size={16} className={isProcessing ? 'text-slate-400' : 'text-indigo-500'}/> 
            {isProcessing ? 'Processing...' : 'Select Local Image'}
          </button>

          {errorMsg ? (
            <p className="text-[10px] uppercase font-bold text-rose-500 leading-tight flex items-center gap-1">
              <AlertCircle size={12} /> {errorMsg}
            </p>
          ) : (
            <p className="text-[10px] uppercase font-bold text-slate-400 leading-tight">
              Image will be automatically downsized and compressed before saving to the vault to preserve database performance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}