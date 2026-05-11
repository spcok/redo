import React from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';

export default function App() {
  // ==========================================
  // V3 PHASE 1: OFFLINE-FIRST MODE
  // Supabase Auth polling is strictly DISABLED. 
  // We rely entirely on the local Zustand authStore bypass.
  // ==========================================
  
  return <RouterProvider router={router} />;
}