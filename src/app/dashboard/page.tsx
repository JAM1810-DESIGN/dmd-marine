import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LIVE_MODULES = [
  { title: "Bookings", href: "/dashboard/bookings" },
  { title: "Service Management", href: "/dashboard/services" },
];

const UPCOMING_MODULES = [
  { title: "Customer CRM", phase: "Phase 6" },
  { title: "Projects", phase: "Phase 7" },
  { title: "Calendar", phase: "Phase 7" },
  { title: "Messages", phase: "Phase 7" },
  { title: "Facebook Integration", phase: "Phase 8" },
  { title: "Finance", phase: "Phase 9" },
  { title: "Reports & Analytics", phase: "Phase 10" },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {session?.user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user?.email} — Phase 5 booking system.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LIVE_MODULES.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{module.title}</CardTitle>
                <CardDescription>Open module</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {UPCOMING_MODULES.map((module) => (
          <Card key={module.title} className="opacity-70">
            <CardHeader>
              <CardTitle className="text-base">{module.title}</CardTitle>
              <CardDescription>Not yet available</CardDescription>
              <CardAction>
                <Badge variant="outline">{module.phase}</Badge>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
