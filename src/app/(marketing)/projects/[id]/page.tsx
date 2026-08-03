import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";

async function getProject(id: string) {
  return db.project.findUnique({
    where: { id, isPublic: true },
    include: { service: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return {};
  return { title: project.name, description: project.summary ?? undefined };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <Section containerClassName="max-w-3xl">
      {project.service && (
        <Badge variant="outline" className="mb-3">
          {project.service.name}
        </Badge>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {project.name}
      </h1>
      {project.summary && <p className="mt-4 text-muted-foreground">{project.summary}</p>}
      {project.description && (
        <p className="mt-6 whitespace-pre-line text-muted-foreground">{project.description}</p>
      )}
    </Section>
  );
}
