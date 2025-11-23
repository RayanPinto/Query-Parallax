export const API_CONFIG = {
  // Using Next.js proxy to avoid CORS issues
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  METRICS_URL: process.env.NEXT_PUBLIC_METRICS_URL || "http://localhost:8000",
};
