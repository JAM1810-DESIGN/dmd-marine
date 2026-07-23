import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Section } from "@/components/marketing/section";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Blog",
  description: "Insights and updates from DMD Marine Consultation & Services.",
};

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <Section containerClassName="max-w-5xl">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold tracking-wide text-gold uppercase">Insights</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
          Blog
        </h1>
      </div>

      {posts.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Articles and updates from the DMD Marine team will be published here soon.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">{post.title}</CardTitle>
                  {post.excerpt && (
                    <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
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
