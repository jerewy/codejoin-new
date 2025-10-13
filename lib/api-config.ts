export const API_CONFIG = {
  BACKEND_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

// Helper function to get API URLs with fallback
export const getApiUrl = (path: string) => {
  const baseUrl = API_CONFIG.BACKEND_URL.replace(/\/$/, "");
  return `${baseUrl}${path}`;
};

// Helper function to get Socket.IO URL
export const getSocketUrl = () => {
  return API_CONFIG.SOCKET_URL.replace(/\/$/, "");
};
