import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config) {
    config.externals.push({ fs: 'commonjs fs', path: 'commonjs path' })
    return config
  },
}

export default nextConfig
