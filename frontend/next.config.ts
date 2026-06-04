import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Prevent webpack from bundling the 'canvas' native module that
    // pdfjs-dist tries to require in Node environments.
    config.resolve.alias.canvas = false;
    return config;
  },

  // Proxy all /api/* requests to the FastAPI backend.
  // This means the frontend and backend are exposed through a single ngrok
  // tunnel (port 3000) — the Next.js server handles the proxy server-side,
  // so the browser never needs to reach port 8000 directly.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
