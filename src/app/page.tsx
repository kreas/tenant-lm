"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeadMagnet {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lead-magnets")
      .then((res) => res.json())
      .then((data) => {
        setLeadMagnets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Lead Magnets
            </h1>
            <p className="text-sm text-zinc-500">
              Manage lead magnet pages for{" "}
              <a
                href="https://www.gettenant.app"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                gettenant.app
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/upload"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Upload New
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                window.location.href = "/login";
              }}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <p className="text-zinc-500">Loading...</p>
        ) : leadMagnets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            <p className="mb-2 text-lg font-medium text-zinc-600 dark:text-zinc-400">
              No lead magnets yet
            </p>
            <p className="mb-6 text-sm text-zinc-500">
              Upload a ZIP file to create your first lead magnet page.
            </p>
            <Link
              href="/admin/upload"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Upload Your First Lead Magnet
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {leadMagnets.map((lm) => (
              <div
                key={lm.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/${lm.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {lm.name}
                    </Link>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        lm.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : lm.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {lm.status}
                    </span>
                  </div>
                  {lm.description && (
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {lm.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    /lm/{lm.slug}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <a
                    href={`/lm/${lm.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    View Page
                  </a>
                  <Link
                    href={`/admin/${lm.id}`}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
