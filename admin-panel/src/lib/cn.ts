/**
 * Minimal className joiner. Keeps component call-sites readable without pulling
 * in clsx/tailwind-merge as new dependencies (the admin panel's package.json is
 * intentionally small).
 */
export function cn(...parts: unknown[]): string {
  // Only strings contribute. Accepting `unknown` lets call-sites write
  // `someReactNode && "pl-9"` without TypeScript complaining about the falsy
  // branch's type, while still ignoring anything that isn't a class name.
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}
