import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadMagnets } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const results = await db
    .select()
    .from(leadMagnets)
    .orderBy(desc(leadMagnets.createdAt));

  return NextResponse.json(results);
}
