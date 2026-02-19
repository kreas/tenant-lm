import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadMagnets, submissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, email, name, ...extraFields } = body;

    if (!slug || !email) {
      return NextResponse.json(
        { error: "slug and email are required" },
        { status: 400 }
      );
    }

    // Look up the lead magnet by slug
    const lm = await db
      .select()
      .from(leadMagnets)
      .where(eq(leadMagnets.slug, slug))
      .limit(1);

    if (lm.length === 0) {
      return NextResponse.json(
        { error: "Lead magnet not found" },
        { status: 404 }
      );
    }

    if (lm[0].status !== "active") {
      return NextResponse.json(
        { error: "This lead magnet is no longer active" },
        { status: 410 }
      );
    }

    const id = uuidv4();
    await db.insert(submissions).values({
      id,
      leadMagnetId: lm[0].id,
      email,
      name: name || null,
      data: Object.keys(extraFields).length > 0
        ? JSON.stringify(extraFields)
        : null,
      createdAt: new Date(),
    });

    // Return success — the lead magnet page JS can handle
    // showing a download link or redirect
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
