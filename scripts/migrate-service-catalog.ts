// One-off, idempotent. Run once per environment:
//   tsx --env-file=.env scripts/migrate-service-catalog.ts
//
// 1. Renames the existing "Third Party Hold Inspection" service (in place,
//    same id) to "Develop Vessel-Specific Draft Survey Form".
// 2. Re-creates "Third Party Hold Inspection" as a child of
//    "Vessel Condition Inspection", reusing the slug the rename freed up.
// 3. Soft-deletes Competency Training, Document Review, Expert Advisory.
import { db } from "../src/lib/db";

async function renameThirdPartyHoldInspection() {
  const oldTopLevel = await db.service.findFirst({
    where: { slug: "third-party-hold-inspection", parentServiceId: null },
  });

  if (!oldTopLevel) {
    console.log("Skip rename: no top-level 'third-party-hold-inspection' service found.");
    return;
  }

  await db.service.update({
    where: { id: oldTopLevel.id },
    data: {
      name: "Develop Vessel-Specific Draft Survey Form",
      slug: "develop-vessel-specific-draft-survey-form",
    },
  });
  console.log(`Renamed service ${oldTopLevel.id} to "Develop Vessel-Specific Draft Survey Form".`);
}

async function createThirdPartyHoldInspectionSubmodule() {
  const vesselCondition = await db.service.findFirst({
    where: { slug: "vessel-condition-inspection" },
  });

  if (!vesselCondition) {
    console.log("Skip submodule create: 'vessel-condition-inspection' service not found.");
    return;
  }

  const service = await db.service.upsert({
    where: { slug: "third-party-hold-inspection" },
    update: { parentServiceId: vesselCondition.id, categoryId: vesselCondition.categoryId },
    create: {
      name: "Third Party Hold Inspection",
      slug: "third-party-hold-inspection",
      categoryId: vesselCondition.categoryId,
      parentServiceId: vesselCondition.id,
    },
  });
  console.log(`Third Party Hold Inspection submodule ready: ${service.id} (parent ${vesselCondition.id}).`);
}

async function softDeleteUnusedServices() {
  const result = await db.service.updateMany({
    where: {
      slug: { in: ["competency-training", "document-review", "expert-advisory"] },
      isActive: true,
    },
    data: { isActive: false },
  });
  console.log(`Soft-deleted ${result.count} unused service(s).`);
}

async function main() {
  await renameThirdPartyHoldInspection();
  await createThirdPartyHoldInspectionSubmodule();
  await softDeleteUnusedServices();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
