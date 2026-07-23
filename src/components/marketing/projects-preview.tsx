import Link from "next/link";
import { db } from "@/lib/db";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export async function ProjectsPreview() {
  const projects = await db.project.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  return (
    <Section>
      <SectionHeading
        eyebrow="Our Work"
        title="Recent Projects"
        description={
          projects.length === 0
            ? "Case studies from recent engagements will appear here soon."
            : undefined
        }
      />

      {projects.length > 0 && (
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  {project.summary && (
                    <CardDescription className="line-clamp-3">
                      {project.summary}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
