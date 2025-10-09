import type { NextConfig } from "next";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";

const nextConfig: NextConfig = {
  // Enable experimental features for better stability
  experimental: {
    // Optimize server components
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Improve build stability
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Configure webpack for better module resolution
  webpack: (config, { isServer, dev }) => {
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

      // Improve module chunking to reduce cache issues
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            minSize: 20000,
            maxSize: 244000,
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };

        // Add module hash stability
        config.output = {
          ...config.output,
          filename: dev ? 'static/js/[name].js' : 'static/js/[name].[contenthash].js',
          chunkFilename: dev ? 'static/js/[name].js' : 'static/js/[name].[contenthash].js',
          cssFilename: dev ? 'static/css/[name].css' : 'static/css/[name].[contenthash].css',
          cssChunkFilename: dev ? 'static/css/[name].css' : 'static/css/[name].[contenthash].css',
        };
      }

      // Handle module resolution errors gracefully
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          // Prevent module resolution issues
          'react': require.resolve('react'),
          'react-dom': require.resolve('react-dom'),
        },
        fallback: {
          ...config.resolve.fallback,
          // Handle missing modules gracefully
          "fs": false,
          "path": false,
          "os": false,
        },
      };
    }

    return config;
  },

  // Configure headers for better caching behavior
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },

  // Configure rewrites for handling stale assets
  async rewrites() {
    return [
      {
        source: '/_next/static/:path*',
        destination: '/_next/static/:path*',
      },
    ];
  },

  // Enable strict mode for better error detection
  reactStrictMode: true,

  // Configure SWC minification for better stability
  swcMinify: true,

  // Configure image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Configure trailing slash behavior
  trailingSlash: false,

  // Configure compression
  compress: true,

  // Configure power headers for better security
  poweredByHeader: false,
};

export default nextConfig;
