export function AccessDenied({ message = "You don't have permission to view this page." }: { message?: string }) {
  return (
    <div className="rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
