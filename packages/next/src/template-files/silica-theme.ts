import * as themeModule from "{{themeSpecifier}}";

const theme = (themeModule.default ?? themeModule) as typeof themeModule;

export const RootLayout = theme.RootLayout;
export const SiteLayout = theme.SiteLayout;
export const PageRenderer = theme.PageRenderer;
export default theme;
