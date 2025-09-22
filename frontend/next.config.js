/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove API rewrites - we'll use environment variables instead
  // This allows for cleaner deployment to Vercel
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
