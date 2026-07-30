const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
module.exports = (phase) => ({
  reactStrictMode: true,
  swcMinify: true,
  // Keep `next dev` isolated from `next build`. Sharing `.next` while both
  // commands run causes stale chunk URLs, missing styles, and broken routing.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});
