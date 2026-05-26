import * as themeModule from "{{themeSpecifier}}";

const theme = (themeModule.default ?? themeModule) as typeof themeModule;

export const Layout = theme.Layout;
export const PageRenderer = theme.PageRenderer;
export default theme;
