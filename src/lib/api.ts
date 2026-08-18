const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Ensure no trailing slash to prevent double-slash redirects (e.g. //api)
export const API_BASE_URL = rawUrl.replace(/\/+$/, "");
