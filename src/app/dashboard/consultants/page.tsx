// src/app/dashboard/consultants/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccessDenied } from "@/components/shared/access-denied";
import { ConsultantsTable } from "./consultants-table";

export const metadata: Metadata = { title: "Consultants" };

export default async function ConsultantsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return <AccessDenied message="Only administrators can manage consultants." />;
  }

  const consultants = await db.user.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Consultants</h1>
        <p className="text-sm text-muted-foreground">
          Maritime consultant directory — rank, vessel experience, and contact details.
        </p>
      </div>

      <ConsultantsTable
        consultants={consultants.map((consultant) => ({
          id: consultant.id,
          name: consultant.name,
          email: consultant.email,
          rank: consultant.rank,
          vesselExperience: consultant.vesselExperience,
          phone: consultant.phone,
          isActive: consultant.isActive,
        }))}
      />
    </div>
  );
}
