import { create } from 'zustand';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  gender: 'boy' | 'girl' | 'other';
  avatarEmoji: string;
}

interface ChildState {
  selectedChildId: string | null;
  isChildMode: boolean;
  childProfiles: ChildProfile[];
  setSelectedChildId: (id: string | null) => void;
  setIsChildMode: (value: boolean) => void;
  setChildProfiles: (profiles: ChildProfile[]) => void;
  addProfile: (profile: ChildProfile) => void;
}

export const useChildStore = create<ChildState>((set) => ({
  selectedChildId: null,
  isChildMode: false,
  childProfiles: [],
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  setIsChildMode: (value) => set({ isChildMode: value }),
  setChildProfiles: (profiles) => set({ childProfiles: profiles }),
  addProfile: (profile) =>
    set((state) => ({ childProfiles: [...state.childProfiles, profile] })),
}));
