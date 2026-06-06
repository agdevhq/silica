import { NextResponse } from "next/server";
import { loadNavigation } from "../server-data.js";

export async function GET() {
  const navigation = await loadNavigation();
  return NextResponse.json(navigation);
}
