/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mphflhluhfaqaweekexp.supabase.co',
      }
    ]
  }
}
module.exports = nextConfig
