import * as themeModule from "{{themeSpecifier}}";

const theme = (themeModule.default ?? themeModule) as typeof themeModule;

export const RootLayout = theme.RootLayout ?? theme.Layout;
export const SiteLayout = theme.SiteLayout ?? theme.Layout;
export const Layout = theme.Layout;
export const PageRenderer = theme.PageRenderer;
export default theme;
