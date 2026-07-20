/** Blog post slugs (filename stem under `src/blog/<slug>.html`). */
export const BLOG_POST_SLUGS = ['college-application-journey', 'raft'] as const;

export type BlogPostSlug = (typeof BLOG_POST_SLUGS)[number];

/** Visitor-facing canonical path (no `.html`). */
export function blogPostCanonicalPath(slug: BlogPostSlug): string {
  return `/blog/${slug}`;
}
