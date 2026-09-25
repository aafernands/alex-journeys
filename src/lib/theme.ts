/**
 * Site appearance.
 *
 * An explicit Light or Dark choice always wins. With no choice — including
 * logged-out visitors — the site follows the device. If the device has no
 * usable preference, evening through early morning is dark.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "aj-theme-change";

/** Local hours. Dark from 19:00 until 07:00. */
export const THEME_NIGHT_START_HOUR = 19;
export const THEME_NIGHT_END_HOUR = 7;

export type ColorScheme = {
  /** At least one prefers-color-scheme query succeeded. */
  queried: boolean;
  dark: boolean;
  light: boolean;
};

export function parseStoredTheme(value: string | null | undefined): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function isNightHour(
  hour: number,
  start = THEME_NIGHT_START_HOUR,
  end = THEME_NIGHT_END_HOUR,
): boolean {
  if (!Number.isFinite(hour)) return false;
  const h = Math.floor(hour);
  return h >= start || h < end;
}

export function readColorScheme(
  matchMediaFn?: ((query: string) => { matches: boolean } | null | undefined) | null,
): ColorScheme {
  if (typeof matchMediaFn !== "function") {
    return { queried: false, dark: false, light: false };
  }
  let queried = false;
  let dark = false;
  let light = false;
  try {
    const list = matchMediaFn("(prefers-color-scheme: dark)");
    if (list) {
      queried = true;
      dark = Boolean(list.matches);
    }
  } catch {
    /* Query unsupported. */
  }
  try {
    const list = matchMediaFn("(prefers-color-scheme: light)");
    if (list) {
      queried = true;
      light = Boolean(list.matches);
    }
  } catch {
    /* Query unsupported. */
  }
  return { queried, dark, light };
}

/**
 * Explicit Light/Dark wins. Otherwise follow a real light or dark device
 * preference. No-preference and a missing matchMedia fall back to local time.
 */
export function resolveThemeDark(
  preference: ThemePreference,
  scheme: ColorScheme,
  hour: number,
): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  if (scheme.queried && (scheme.dark || scheme.light)) return scheme.dark;
  return isNightHour(hour);
}

/** Milliseconds until the next 07:00 or 19:00 boundary in local time. */
export function msUntilThemeBoundary(
  now: Date,
  start = THEME_NIGHT_START_HOUR,
  end = THEME_NIGHT_END_HOUR,
): number {
  const hour = now.getHours();
  const target = new Date(now);
  target.setSeconds(0, 0);
  if (hour < end) {
    target.setHours(end, 0, 0, 0);
  } else if (hour < start) {
    target.setHours(start, 0, 0, 0);
  } else {
    target.setDate(target.getDate() + 1);
    target.setHours(end, 0, 0, 0);
  }
  const delta = target.getTime() - now.getTime();
  return delta > 0 ? delta : 60_000;
}

export function readStoredTheme(): ThemePreference {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference, now = new Date()): boolean {
  const dark = resolveThemeDark(
    preference,
    readColorScheme(
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia.bind(window)
        : null,
    ),
    now.getHours(),
  );
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export function writeStoredTheme(preference: ThemePreference): boolean {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Storage is optional. The choice still applies for this view. */
  }
  const dark = applyThemePreference(preference);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }
  return dark;
}

/**
 * Runs in the document head before first paint. Keep this in step with
 * resolveThemeDark — scripts/theme.test.mjs checks they agree.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var stored=null;try{stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});}catch(e){}var dark=false;if(stored==="dark"){dark=true;}else if(stored!=="light"){var prefersDark=false,prefersLight=false,saw=false;try{if(window.matchMedia){var d=window.matchMedia("(prefers-color-scheme: dark)");if(d){saw=true;prefersDark=!!d.matches;}}}catch(e){}try{if(window.matchMedia){var l=window.matchMedia("(prefers-color-scheme: light)");if(l){saw=true;prefersLight=!!l.matches;}}}catch(e){}if(saw&&(prefersDark||prefersLight)){dark=prefersDark;}else{var hour=new Date().getHours();dark=hour>=${THEME_NIGHT_START_HOUR}||hour<${THEME_NIGHT_END_HOUR};}}if(dark)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`;
