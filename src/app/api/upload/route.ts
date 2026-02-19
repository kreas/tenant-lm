import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadMagnets } from "@/lib/db/schema";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = formData.get("description") as string | null;

    if (!file || !name) {
      return NextResponse.json(
        { error: "File and name are required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Only ZIP files are accepted" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const baseSlug = slugify(name);
    const slug = baseSlug || id.slice(0, 8);

    // Extract ZIP to uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads", slug);

    // Check if slug already exists on disk
    if (fs.existsSync(uploadsDir)) {
      return NextResponse.json(
        { error: "A lead magnet with a similar name already exists. Please choose a different name." },
        { status: 409 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Security: validate entries before extracting
    for (const entry of entries) {
      const entryPath = entry.entryName;
      if (entryPath.includes("..") || path.isAbsolute(entryPath)) {
        return NextResponse.json(
          { error: "ZIP contains invalid paths" },
          { status: 400 }
        );
      }
    }

    // Find if there's a root directory wrapper in the ZIP
    // (common when zipping a folder — all files are under one dir)
    let stripPrefix = "";
    const topLevelDirs = new Set<string>();
    const topLevelFiles = new Set<string>();
    for (const entry of entries) {
      const parts = entry.entryName.split("/");
      if (parts.length > 1 && parts[0]) {
        topLevelDirs.add(parts[0]);
      } else if (!entry.isDirectory) {
        topLevelFiles.add(parts[0]);
      }
    }

    // If all files are under a single directory and there are no top-level files
    if (topLevelDirs.size === 1 && topLevelFiles.size === 0) {
      stripPrefix = [...topLevelDirs][0] + "/";
    }

    fs.mkdirSync(uploadsDir, { recursive: true });

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      let entryPath = entry.entryName;
      if (stripPrefix && entryPath.startsWith(stripPrefix)) {
        entryPath = entryPath.slice(stripPrefix.length);
      }
      if (!entryPath) continue;

      const fullPath = path.join(uploadsDir, entryPath);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, entry.getData());
    }

    // Verify an index.html exists
    const hasIndex = fs.existsSync(path.join(uploadsDir, "index.html"));
    if (!hasIndex) {
      // Clean up
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: "ZIP must contain an index.html file at the root level" },
        { status: 400 }
      );
    }

    // Insert into database
    const now = new Date();
    await db.insert(leadMagnets).values({
      id,
      slug,
      name,
      description: description || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      id,
      slug,
      name,
      url: `/lm/${slug}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
