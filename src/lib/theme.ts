export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

// Inlined into the HTML head before first paint so the stored preference lands on
// <html> without a flash. Kept as a string because it must bypass the React tree:
// React 19 re-creates any <script> that lives inside a component during hydration.
export const themeInitScript = `(function(){try{var e=localStorage.getItem("theme"),m=window.matchMedia("(prefers-color-scheme: dark)").matches,d=e==="dark"||(e!=="light"&&m),r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
