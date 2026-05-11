import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// ==========================================
// AUDIT IMPLEMENTATION: Hardened Query Client
// Offline-First configuration for PGlite WASM
// ==========================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 1. Reduce WASM hits. Consider local data "fresh" for 30 seconds.
      staleTime: 1000 * 30, 
      // 2. Keep components cached in memory for 24 hours.
      gcTime: 1000 * 60 * 60 * 24, 
      // 3. Local SQL queries should fail fast if there's an error.
      retry: false, 
      // 4. Do not re-query PGlite just because the user Alt-Tabbed.
      refetchOnWindowFocus: false, 
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);