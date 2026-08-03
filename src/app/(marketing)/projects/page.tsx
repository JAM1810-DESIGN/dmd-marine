import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Projects",
  description: "Recent marine consultancy, survey, and inspection engagements from DMD Marine.",
};

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <Section containerClassName="max-w-5xl">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold tracking-wide text-accent uppercase">
          Our Work
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Projects
        </h1>
      </div>

      {projects.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Case studies from recent engagements will appear here soon.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
