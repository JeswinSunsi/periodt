// The switcher renders this registry. Add an entry and its CSS token overrides
// in styles/themes.css to make a new theme available everywhere.
export const themes = Object.freeze([
  Object.freeze({
    id: "sage",
    label: "Sage",
    swatch: "var(--theme-swatch-sage)",
    browserColor: "#f7f7f2",
  }),
  Object.freeze({
    id: "pink",
    label: "Pink",
    swatch: "var(--theme-swatch-pink)",
    browserColor: "#fff5f8",
  }),
]);

export const DEFAULT_THEME_ID = "sage";
export const THEME_STORAGE_KEY = "periodt-theme";

export function findTheme(id) {
  return themes.find((theme) => theme.id === id);
}
