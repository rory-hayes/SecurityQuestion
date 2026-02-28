/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sqc/ui-catalyst', '@sqc/shared'],
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
}

export default nextConfig
