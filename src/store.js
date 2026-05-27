import { create } from 'zustand'

export const useStore = create((set) => ({
  hoveredNode: null,
  setHoveredNode: (node) => set({ hoveredNode: node }),
  isMapVisible: false,
  setIsMapVisible: (visible) => set({ isMapVisible: visible }),
  activePillar: null,
  setActivePillar: (pillar) => set({ activePillar: pillar }),
  viewMode: 'map', // 'map', 'transition', 'takeover', 'retract'
  setViewMode: (mode) => set({ viewMode: mode }),
}))
