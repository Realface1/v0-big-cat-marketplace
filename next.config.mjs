/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'verbose-waddle-pjxwqwqw96rrc7vvg-3000.app.github.dev'],
    },
  },
}

export default nextConfig
