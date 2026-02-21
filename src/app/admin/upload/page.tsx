"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UploadPayload =
  | { type: "zip"; file: File }
  | { type: "folder"; files: File[]; folderName: string };

interface FileWithPath extends File {
  __relativePath?: string;
}

async function readDirectoryEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  let batch: FileSystemEntry[];
  do {
    batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    entries.push(...batch);
  } while (batch.length > 0);
  return entries;
}

async function readAllFiles(
  entry: FileSystemDirectoryEntry,
  path = "",
): Promise<FileWithPath[]> {
  const files: FileWithPath[] = [];
  const entries = await readDirectoryEntries(entry.createReader());

  for (const child of entries) {
    const childPath = path ? `${path}/${child.name}` : child.name;
    if (child.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (child as FileSystemFileEntry).file(resolve, reject),
      );
      const withPath = file as FileWithPath;
      withPath.__relativePath = childPath;
      files.push(withPath);
    } else if (child.isDirectory) {
      const nested = await readAllFiles(
        child as FileSystemDirectoryEntry,
        childPath,
      );
      files.push(...nested);
    }
  }
  return files;
}

export default function UploadPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [payload, setPayload] = useState<UploadPayload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    if (!items?.length) return;

    const firstItem = items[0];
    const entry = firstItem.webkitGetAsEntry?.();

    if (entry?.isDirectory) {
      const files = await readAllFiles(entry as FileSystemDirectoryEntry);
      if (files.length === 0) {
        setError("Folder is empty");
        return;
      }
      setPayload({ type: "folder", files, folderName: entry.name });
      setError("");
      return;
    }

    // Not a directory — check if it's a zip file
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".zip")) {
      setPayload({ type: "zip", file: droppedFile });
      setError("");
    } else {
      setError("Only ZIP files or folders are accepted");
    }
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPayload({ type: "zip", file: e.target.files[0] });
      setError("");
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const files: FileWithPath[] = [];
    let folderName = "";

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i] as FileWithPath;
      const relativePath = f.webkitRelativePath;
      if (!folderName && relativePath) {
        folderName = relativePath.split("/")[0];
      }
      // Store path without the root folder prefix
      f.__relativePath = relativePath
        ? relativePath.split("/").slice(1).join("/")
        : f.name;
      files.push(f);
    }

    if (files.length === 0) {
      setError("Folder is empty");
      return;
    }

    setPayload({ type: "folder", files, folderName });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload || !name.trim()) return;

    setError("");

    let fileToUpload: File;

    if (payload.type === "zip") {
      fileToUpload = payload.file;
    } else {
      setZipping(true);
      try {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (const f of payload.files) {
          const relativePath =
            (f as FileWithPath).__relativePath || f.name;
          zip.file(relativePath, f);
        }

        const blob = await zip.generateAsync({ type: "blob" });
        fileToUpload = new File(
          [blob],
          `${payload.folderName}.zip`,
          { type: "application/zip" },
        );
      } catch {
        setError("Failed to prepare files. Please try again.");
        setZipping(false);
        return;
      }
      setZipping(false);
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("name", name.trim());
    formData.append("description", description.trim());

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      router.push(`/admin/${data.id}`);
    } catch {
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  const payloadLabel = payload
    ? payload.type === "zip"
      ? payload.file.name
      : `${payload.folderName}/ (${payload.files.length} file${payload.files.length === 1 ? "" : "s"})`
    : null;

  const payloadSize =
    payload?.type === "zip"
      ? payload.file.size
      : payload?.type === "folder"
        ? payload.files.reduce((sum, f) => sum + f.size, 0)
        : 0;

  const buttonDisabled = zipping || uploading || !payload || !name.trim();
  const buttonText = zipping
    ? "Preparing files..."
    : uploading
      ? "Uploading..."
      : "Upload Lead Magnet";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            &larr; Back
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Upload Lead Magnet
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Property Investment Guide"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              This will be used to generate the URL slug.
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for internal reference"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Files *
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
                  : payload
                    ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                    : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <input
                ref={zipInputRef}
                type="file"
                accept=".zip"
                onChange={handleZipChange}
                className="hidden"
              />
              <input
                ref={folderInputRef}
                type="file"
                /* @ts-expect-error webkitdirectory is not in React's type defs */
                webkitdirectory=""
                onChange={handleFolderChange}
                className="hidden"
              />
              {payload ? (
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {payloadLabel}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {(payloadSize / 1024 / 1024).toFixed(2)} MB —{" "}
                    <button
                      type="button"
                      onClick={() => zipInputRef.current?.click()}
                      className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Choose ZIP
                    </button>
                    {" or "}
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Choose folder
                    </button>
                    {" to replace"}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-zinc-600 dark:text-zinc-400">
                    Drop a ZIP file or folder here
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    <button
                      type="button"
                      onClick={() => zipInputRef.current?.click()}
                      className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Choose ZIP
                    </button>
                    {" or "}
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      Choose folder
                    </button>
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Must contain an index.html at the root level
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={buttonDisabled}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {buttonText}
          </button>
        </form>
      </main>
    </div>
  );
}
