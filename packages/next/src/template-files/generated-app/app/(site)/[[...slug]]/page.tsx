import { after } from "next/server";
import theme from "../../../silica-theme";
import { VaultContent } from "@silicajs/next/routes/page";
import { getRenderKey, normalizeRouteSlug } from "@silicajs/next/server-data";
import {
  isSilicaTimingEnabled,
  logSilicaTiming,
  nowSilicaTimingMs,
  roundTimingMs,
  timeSilica,
  timeSilicaAsync,
  withSilicaTimingTrace,
} from "@silicajs/next/server-timing";
export {
  generateMetadata,
  generateStaticParams,
} from "@silicajs/next/routes/page";

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
}) {
  const startedAt = nowSilicaTimingMs();
  let slug = "unknown";
  let renderHash = "unknown";
  let renderEnvironmentHash = "unknown";

  return withSilicaTimingTrace(
    "page.request",
    { route: "vault-page" },
    async () => {
      registerAfterLog(() =>
        logSilicaTiming("page.response", {
          slug,
          renderHash,
          renderEnvironmentHash,
          durationMs: roundTimingMs(nowSilicaTimingMs() - startedAt),
        }),
      );

      const resolvedParams = await timeSilicaAsync("page.params", {}, () =>
        Promise.resolve(params),
      );
      slug = timeSilica("page.normalize-slug", {}, () =>
        normalizeRouteSlug(resolvedParams?.slug),
      );
      const renderKey = timeSilica("page.render-key", { slug }, () =>
        getRenderKey(slug),
      );
      renderHash = renderKey.renderHash;
      renderEnvironmentHash = renderKey.renderEnvironmentHash;
      logSilicaTiming("page.render-content", {
        slug,
        renderHash,
        renderEnvironmentHash,
      });

      return (
        <VaultContent
          slug={slug}
          renderHash={renderKey.renderHash}
          renderEnvironmentHash={renderKey.renderEnvironmentHash}
          theme={theme}
        />
      );
    },
  );
}

function registerAfterLog(callback: () => void): void {
  if (!isSilicaTimingEnabled()) return;

  try {
    after(callback);
  } catch (error) {
    logSilicaTiming("page.after-unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
