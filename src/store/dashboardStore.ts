import { create } from 'zustand';

export type CategoryFilter = 'Owls' | 'Raptors' | 'Mammals' | 'Exotics' | 'ARCHIVED';

interface DashboardState {
  viewingDate: Date;
  sortOrder: 'alpha-asc' | 'alpha-desc';
  categoryFilter: CategoryFilter;
  setCategoryFilter: (filter: CategoryFilter) => void;
  shiftDate: (days: number) => void;
  resetToToday: () => void;
  toggleSortOrder: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  viewingDate: new Date(),
  sortOrder: 'alpha-asc',
  categoryFilter: 'Owls',
  setCategoryFilter: (filter) => set({ categoryFilter: filter }),
  shiftDate: (days) => set((state) => {
    const newDate = new Date(state.viewingDate);
    newDate.setDate(newDate.getDate() + days);
    return { viewingDate: newDate };
  }),
  resetToToday: () => set({ viewingDate: new Date() }),
  toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc' })),
}));