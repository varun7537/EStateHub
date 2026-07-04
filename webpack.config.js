// webpack.config.js  ← place this in your PROJECT ROOT (same folder as package.json)
// ─────────────────────────────────────────────────────────────────────────────
// PURPOSE: Proxy all /api/* requests from the Expo web dev server to your
//          Express backend at localhost:5000.
//
// WHY THIS FIXES ERR_INTERNET_DISCONNECTED / ERR_NETWORK:
//   The browser blocks cross-origin requests to localhost:5000 from a page
//   served on localhost:19006 (or 8081). Using a proxy makes the frontend
//   fetch its own origin (/api/...) and the dev server silently forwards it
//   to :5000. No CORS issue, no ERR_INTERNET_DISCONNECTED.
//
// SETUP:
//   1. npm install @expo/webpack-config  (if not already installed)
//   2. Place this file in your project root
//   3. Restart Expo: npx expo start --web
// ─────────────────────────────────────────────────────────────────────────────

const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add dev-server proxy
  config.devServer = {
    ...config.devServer,
    proxy: {
      // Every request to /api/* gets forwarded to http://localhost:5000/api/*
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,   // rewrites the Host header to match the target
        secure:       false,  // allow self-signed certs if you ever use HTTPS locally
        logLevel:     'debug', // shows proxy activity in your terminal
        onError: (err, req, res) => {
          console.error('[PROXY ERROR] Could not reach backend:', err.message);
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Backend unavailable',
            message: 'Make sure your Express server is running on port 5000',
          }));
        },
      },
    },
  };

  return config;
};