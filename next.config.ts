import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  webpack(webpackConfig) {
    webpackConfig.resolve ??= {}
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      '@clip-workspace': path.resolve(process.cwd(), '.workspace/clips'),
    }
    return webpackConfig
  },
}

export default nextConfig
