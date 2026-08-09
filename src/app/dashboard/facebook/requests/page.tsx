import type { Metadata } from "next";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { FacebookRequests } from "../facebook-requests";

export const metadata: Metadata = { title: "Facebook Requests" };

export default async function FacebookRequestsPage() {
  const session = await auth();
  const canManage =
    session?.user.role === "ADMIN" ||
    session?.user.role === "MANAGER" ||
    session?.user.role === "STAFF";

  const leads = await db.facebookLead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
        <p className="text-sm text-muted-foreground">
          Booking and lead requests submitted through your Facebook Page.
        </p>
      </div>

      <FacebookRequests
        canManage={canManage}
        requests={leads.map((lead) => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          status: lead.status,
          customerId: lead.customerId,
          createdAt: lead.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
