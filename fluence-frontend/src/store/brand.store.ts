import { create } from 'zustand';

interface BrandState {
    brandId: string | null;
    setBrandId: (id: string | null) => void;
}

export const useBrandStore = create<BrandState>(set => ({
    brandId: null,
    setBrandId: (id) => set({ brandId: id }),
}));
