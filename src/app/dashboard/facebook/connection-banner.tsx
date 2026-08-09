import Link from "next/link";
import { Megaphone, CheckCircle2 } from "lucide-react";

export function ConnectionBanner({ configured, pageName }: { configured: boolean; pageName: string }) {
  if (configured) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success/10 p-4 ring-1 ring-success/20">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium text-foreground">Connected</p>
          <p className="text-sm text-muted-foreground">
            {pageName} is receiving messages, comments, and reviews.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent/10 p-4 ring-1 ring-accent/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Megaphone className="size-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-medium text-foreground">Not connected</p>
          <p className="text-sm text-muted-foreground">
            Connect {pageName}&rsquo;s Facebook Page to receive messages and reviews.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/facebook/connection"
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Connect Page
      </Link>
    </div>
  );
}
