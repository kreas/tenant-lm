"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface Submission {
  id: string;
  email: string;
  name: string | null;
  data: string | null;
  createdAt: string;
}

interface LeadMagnetDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  submissions: Submission[];
}

export default function LeadMagnetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<LeadMagnetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/lead-magnets/${id}`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead magnet and all its submissions?")) {
      return;
    }
    setDeleting(true);
    await fetch(`/api/lead-magnets/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const handleStatusToggle = async () => {
    if (!data) return;
    const newStatus = data.status === "active" ? "archived" : "active";
    await fetch(`/api/lead-magnets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setData({ ...data, status: newStatus });
  };

  const copyUrl = () => {
    if (!data) return;
    const url = `${window.location.origin}/lm/${data.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    if (!data || data.submissions.length === 0) return;
    const headers = ["Email", "Name", "Date", "Extra Data"];
    const rows = data.submissions.map((s) => [
      s.email,
      s.name || "",
      new Date(s.createdAt).toLocaleString(),
      s.data || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.slug}-submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Lead magnet not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            &larr; Back
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {data.name}
          </h1>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              data.status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {data.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Info Section */}
        <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Public URL
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-sm text-zinc-700 dark:text-zinc-300">
                  /lm/{data.slug}
                </code>
                <button
                  onClick={copyUrl}
                  className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {copied ? "Copied!" : "Copy Full URL"}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Submissions
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {data.submissions.length}
              </p>
            </div>
            {data.description && (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Description
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {data.description}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <a
              href={`/lm/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              View Page
            </a>
            <button
              onClick={handleStatusToggle}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {data.status === "active" ? "Archive" : "Activate"}
            </button>
            {data.submissions.length > 0 && (
              <button
                onClick={exportCsv}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Export CSV
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {/* Submissions Table */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Submissions
          </h2>
          {data.submissions.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
              <p className="text-zinc-500">No submissions yet</p>
              <p className="mt-1 text-sm text-zinc-400">
                Share the page URL to start collecting leads.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 font-medium text-zinc-500">
                      Email
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-500">
                      Name
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-500">
                      Date
                    </th>
                    <th className="px-4 py-3 font-medium text-zinc-500">
                      Extra Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {data.submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="bg-white dark:bg-zinc-900/50"
                    >
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {sub.email}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {sub.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-zinc-500">
                        {sub.data || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
