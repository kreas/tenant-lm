import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadMagnets, submissions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leadMagnet = await db
    .select()
    .from(leadMagnets)
    .where(eq(leadMagnets.id, id))
    .limit(1);

  if (leadMagnet.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subs = await db
    .select()
    .from(submissions)
    .where(eq(submissions.leadMagnetId, id))
    .orderBy(desc(submissions.createdAt));

  return NextResponse.json({
    ...leadMagnet[0],
    submissions: subs,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status) updates.status = body.status;

  await db.update(leadMagnets).set(updates).where(eq(leadMagnets.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const leadMagnet = await db
    .select()
    .from(leadMagnets)
    .where(eq(leadMagnets.id, id))
    .limit(1);

  if (leadMagnet.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete uploaded files
  const uploadsDir = path.join(process.cwd(), "uploads", leadMagnet[0].slug);
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  }

  // Delete submissions first (foreign key)
  await db.delete(submissions).where(eq(submissions.leadMagnetId, id));
  await db.delete(leadMagnets).where(eq(leadMagnets.id, id));

  return NextResponse.json({ success: true });
}
