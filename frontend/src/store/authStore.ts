import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LoginResponse } from "@rmbs/shared";

interface AuthState {
  token: string | null;
  user: LoginResponse["user"] | null;
  setSession: (session: LoginResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: ({ token, user }) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "rmbs-auth", // localStorage key
    }
  )
);
