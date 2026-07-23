import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardLayout } from "@/components/shared/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardLayout
      user={{
        name: session.user.name ?? "Unknown",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
