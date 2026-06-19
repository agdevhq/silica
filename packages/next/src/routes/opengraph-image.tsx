import { ImageResponse } from "next/og";
import { cacheLife, cacheTag } from "next/cache";
import { getMetaDescription } from "@silicajs/core/runtime";
import {
  getConfig,
  getPage,
  getRenderKey,
  normalizeRouteSlug,
} from "../server-data.js";
import {
  clampText,
  hostnameFromBaseUrl,
  titleFontSize,
} from "./opengraph-image-format.js";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const ACCENT = "#8b5cf6";
const BACKGROUND_TOP = "#1c1330";
const BACKGROUND_BOTTOM = "#0c0717";

type RouteContext = {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
};

type OpengraphImageData = {
  siteTitle: string;
  title: string;
  description?: string;
  tags: string[];
  domain?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const slug = normalizeRouteSlug(params?.slug);
  const renderKey = getRenderKey(slug);
  const data = await getOpengraphImageData(
    slug,
    renderKey.renderHash,
    renderKey.renderEnvironmentHash,
  );

  return new ImageResponse(<OpengraphImageCard {...data} />, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
  });
}

async function getOpengraphImageData(
  slug: string,
  renderHash: string,
  renderEnvironmentHash: string,
): Promise<OpengraphImageData> {
  "use cache";
  cacheLife("max");
  cacheTag(
    `environment:${renderEnvironmentHash}`,
    `page:${slug}`,
    `render:${renderHash}`,
  );
  const config = getConfig();
  const entry = getPage(slug);
  return {
    siteTitle: config.title,
    title: entry?.title ?? config.title,
    description: entry ? getMetaDescription(entry) : config.description,
    tags: entry?.tags?.slice(0, 4) ?? [],
    domain: hostnameFromBaseUrl(config.baseUrl),
  };
}

function OpengraphImageCard({
  siteTitle,
  title,
  description,
  tags,
  domain,
}: OpengraphImageData) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "80px",
        color: "#f8fafc",
        backgroundColor: BACKGROUND_BOTTOM,
        backgroundImage: `linear-gradient(135deg, ${BACKGROUND_TOP} 0%, ${BACKGROUND_BOTTOM} 100%)`,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "20px",
            height: "44px",
            borderRadius: "6px",
            backgroundColor: ACCENT,
            marginRight: "24px",
          }}
        />
        <div
          style={{
            fontSize: "34px",
            fontWeight: 600,
            color: "#cbb6ff",
            letterSpacing: "-0.01em",
          }}
        >
          {siteTitle}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize(title),
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {clampText(title, 90)}
        </div>
        {description ? (
          <div
            style={{
              display: "flex",
              marginTop: "28px",
              fontSize: "32px",
              lineHeight: 1.35,
              color: "#c7c9d9",
            }}
          >
            {clampText(description, 160)}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                marginRight: "16px",
                padding: "8px 20px",
                borderRadius: "999px",
                border: "1px solid rgba(139, 92, 246, 0.5)",
                color: "#cbb6ff",
                fontSize: "24px",
              }}
            >
              #{tag}
            </div>
          ))}
        </div>
        {domain ? (
          <div style={{ display: "flex", fontSize: "26px", color: "#8c8fa3" }}>
            {domain}
          </div>
        ) : null}
      </div>
    </div>
  );
}
