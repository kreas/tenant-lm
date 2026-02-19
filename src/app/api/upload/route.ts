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

    // Junk patterns to ignore (macOS, Windows artifacts)
    const JUNK_PATTERNS = ["__MACOSX/", ".DS_Store", "Thumbs.db", "desktop.ini"];
    function isJunk(entryName: string): boolean {
      return JUNK_PATTERNS.some(
        (p) => entryName === p || entryName.startsWith(p) || entryName.includes("/" + p)
      );
    }

    // Filter to meaningful entries only
    const meaningful = entries.filter((e) => !isJunk(e.entryName));

    // Security: validate entries before extracting
    for (const entry of meaningful) {
      const entryPath = entry.entryName;
      if (entryPath.includes("..") || path.isAbsolute(entryPath)) {
        return NextResponse.json(
          { error: "ZIP contains invalid paths" },
          { status: 400 }
        );
      }
    }

    // Find the directory that contains index.html
    // This handles wrapper directories at any depth
    let stripPrefix = "";
    const indexEntry = meaningful.find(
      (e) => !e.isDirectory && e.entryName.endsWith("index.html")
    );

    if (indexEntry) {
      const idx = indexEntry.entryName.lastIndexOf("index.html");
      stripPrefix = indexEntry.entryName.slice(0, idx); // e.g. "folder/" or "folder/subfolder/" or ""
    }

    fs.mkdirSync(uploadsDir, { recursive: true });

    for (const entry of meaningful) {
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
        { error: "ZIP must contain an index.html file" },
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
