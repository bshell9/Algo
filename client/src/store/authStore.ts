import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  shopId?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  selectedShopId: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSelectedShop: (shopId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      selectedShopId: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, selectedShopId: user.shopId || null }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      setSelectedShop: (shopId) => set({ selectedShopId: shopId }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, selectedShopId: null }),
    }),
    { name: 'autoglass-auth' }
  )
);
