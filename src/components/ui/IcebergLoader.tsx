type IcebergLoaderProps = {
  message?: string;
};

export function IcebergLoader({ message = "Loading Iceberg data…" }: IcebergLoaderProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-slate-950 px-5 py-4 text-slate-50 shadow-2xl">
        <img className="h-9 w-9 animate-pulse rounded-xl object-cover" src="/app.png" alt="" />
        <div>
          <p className="text-sm font-semibold">{message}</p>
          <p className="text-xs text-slate-400">Reading metadata and query results</p>
        </div>
      </div>
    </div>
  );
}
