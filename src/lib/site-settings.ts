import { cache } from "react";
import { db } from "@/lib/db";

export const getSiteSettings = cache(async () => {
  return db.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
});
