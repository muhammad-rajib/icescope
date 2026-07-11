import { X } from "lucide-react";
import { useToastStore } from "../../stores/toastStore";

export function ToastViewport() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border bg-slate-950/95 p-4 text-slate-50 shadow-2xl backdrop-blur ${
            toast.kind === "error"
              ? "border-red-500/50"
              : toast.kind === "success"
                ? "border-emerald-500/50"
                : toast.kind === "warning"
                  ? "border-amber-500/50"
                  : "border-sky-500/50"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">{toast.title}</h3>
              {toast.message && (
                <p className="mt-1 max-h-32 overflow-auto text-sm text-slate-300">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => removeToast(toast.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
