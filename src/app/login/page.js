export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Login</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access Business Mart
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-10 w-full bg-muted animate-pulse rounded border" />
          </div>
          <div className="space-y-2">
            <div className="h-10 w-full bg-muted animate-pulse rounded border" />
          </div>
          <div className="h-10 w-full bg-primary/50 animate-pulse rounded" />
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Auth functionality will be implemented in future steps.
        </div>
      </div>
    </div>
  );
}
