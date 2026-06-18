import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import { getCacheState, getNavigation } from "../server-data.js";
import {
  logSilicaTiming,
  timeSilica,
  timeSilicaAsync,
  withSilicaTimingTrace,
} from "../server-timing.js";

export async function GET() {
  return withSilicaTimingTrace("api.navigation.request", {}, async () => {
    const cacheState = timeSilica("api.navigation.cache-state", {}, () =>
      getCacheState(),
    );
    const navigation = await getCachedNavigation(
      cacheState.renderEnvironmentHash,
      cacheState.navigationHash,
    );
    logSilicaTiming("api.navigation.response", {
      entryCount: navigation.entries.length,
    });
    return NextResponse.json(navigation);
  });
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
  logSilicaTiming("api.navigation.cache-miss", {
    renderEnvironmentHash,
    navigationHash,
  });
  return timeSilicaAsync("api.navigation.get-navigation", {}, () =>
    getNavigation(),
  );
}
