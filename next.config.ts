import type { NextConfig } from "next";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Monaco Editor requires special handling for its web workers.
    // We only want to apply this configuration on the client side.
    if (!isServer) {
      config.plugins = config.plugins || []; // Ensure plugins array exists
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["javascript", "typescript", "html", "css", "json"],
          filename: "static/[name].worker.js",
        })
      );
    }
    return config;
  },
};

export default nextConfig;
