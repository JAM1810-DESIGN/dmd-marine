import { FacebookNav } from "./facebook-nav";

export default function FacebookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <FacebookNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
