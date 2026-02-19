import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadMagnets, submissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, data } = body;

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
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
    const formData = typeof data === "object" && data !== null ? data : {};

    // Extract email/name from form data if present
    const email = formData.email || formData.Email || null;
    const name = formData.name || formData.Name || formData.full_name || formData.fullName || null;

    console.log(`[submission] slug=${slug} lead_magnet=${lm[0].name}`, formData);

    await db.insert(submissions).values({
      id,
      leadMagnetId: lm[0].id,
      email,
      name,
      data: JSON.stringify(formData),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
