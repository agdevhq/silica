import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import { getCacheState, getNavigation } from "../server-data.js";

export async function GET() {
  const cacheState = getCacheState();
  const navigation = await getCachedNavigation(
    cacheState.renderEnvironmentHash,
    cacheState.navigationHash,
  );
  return NextResponse.json(navigation);
}

async function getCachedNavigation(
  renderEnvironmentHash: string,
  navigationHash: string,
) {
  "use cache";
  cacheLife("max");
  cacheTag(
    `environment:${renderEnvironmentHash}`,
    `navigation:${navigationHash}`,
  );
  return getNavigation();
}
