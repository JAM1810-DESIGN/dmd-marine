import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";

async function getPost(slug: string) {
  return db.blogPost.findUnique({
    where: { slug, isPublished: true },
    include: { author: { select: { name: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt ?? undefined };
}

export async function generateStaticParams() {
  const posts = await db.blogPost.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return posts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <Section containerClassName="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {post.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {post.author?.name && `${post.author.name} · `}
        {post.publishedAt?.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <div className="mt-8 max-w-none space-y-4 whitespace-pre-line leading-relaxed text-muted-foreground">
        {post.content}
      </div>
    </Section>
  );
}
