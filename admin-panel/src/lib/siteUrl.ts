/**
 * Base URL of the public website, used for "view on site" links.
 *
 * The fallback matches the public site's dev port (`npm run dev:frontend` →
 * :3100). It used to be copied into each page as `http://localhost:3000`,
 * which pointed nowhere.
 */
export const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3100";
