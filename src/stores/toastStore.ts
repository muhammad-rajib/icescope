import { create } from "zustand";

export type ToastKind = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
};

type ToastState = {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts.filter((item) => item.title !== toast.title), { ...toast, id }].slice(-4),
    }));
    window.setTimeout(() => {
      useToastStore.getState().removeToast(id);
    }, toast.kind === "error" ? 8000 : toast.kind === "warning" ? 5500 : 3500);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
