export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminBlogDeleteButton from "@/components/AdminBlogDeleteButton";

async function getAllPosts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, category, published, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminBlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blog Posts</h1>
          <p className="mt-1 text-slate-500">
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Write New Post
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">Blog SEO fields audit</p>
        <p className="mt-1 text-blue-800">
          If the upgraded blog metadata fields are missing in Supabase, the editor can still load but
          SEO saves will be limited until the blog SEO migration is applied.
        </p>
        <Link href="/admin/audit" className="mt-3 inline-flex font-semibold text-blue-700 hover:underline">
          Open system audit
        </Link>
      </div>

      <div className="mt-8">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
            <p className="text-slate-500">No blog posts yet.</p>
            <Link
              href="/admin/blog/new"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Write your first post
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  <th className="px-6 py-3 font-semibold text-slate-600">Title</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Category</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Created</th>
                  <th className="px-6 py-3 font-semibold text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{post.title}</td>
                    <td className="px-6 py-4 text-slate-600">{post.category ?? "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          post.published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(post.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-4">
                        {post.published && (
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="text-xs font-semibold text-slate-500 hover:underline"
                          >
                            View
                          </Link>
                        )}
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <AdminBlogDeleteButton id={post.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
