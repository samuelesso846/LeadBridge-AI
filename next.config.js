/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mphflhluhfaqaweekexp.supabase.co',
      }
    ]
  },
  experimental: {
    turbo: {
      enabled: false
    }
  }
}
module.exports = nextConfig
