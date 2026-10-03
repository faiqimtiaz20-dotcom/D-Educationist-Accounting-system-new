import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  selectedBranchId: string
  darkMode: boolean
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setSelectedBranchId: (id: string) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarOpen: () => void
  toggleSidebarCollapsed: () => void
  toggleDarkMode: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedBranchId: 'all',
      darkMode: false,
      sidebarOpen: false,
      sidebarCollapsed: false,
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarOpen: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode
          document.documentElement.classList.toggle('dark', next)
          return { darkMode: next }
        }),
    }),
    { name: 'saa-app-store', partialize: (s) => ({ darkMode: s.darkMode, sidebarCollapsed: s.sidebarCollapsed }) }
  )
)

interface ApprovalState {
  approvals: { id: string; status: 'Approved' | 'Rejected' }[]
  updateApproval: (id: string, status: 'Approved' | 'Rejected') => void
}

export const useApprovalStore = create<ApprovalState>((set) => ({
  approvals: [],
  updateApproval: (id, status) =>
    set((s) => ({
      approvals: [...s.approvals.filter((a) => a.id !== id), { id, status }],
    })),
}))
