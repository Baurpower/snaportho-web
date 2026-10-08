import type { NextConfig } from 'next'
import { SNAPORTHO_ADDON_LATEST_VERSION } from './src/lib/anki/addon-release'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/anki/addon/download': [`./dist/snaportho-${SNAPORTHO_ADDON_LATEST_VERSION}.ankiaddon`],
  },
  webpack(config) {
    config.externals.push({ fs: 'commonjs fs', path: 'commonjs path' });
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/anki/search-requests/pending',
        destination: '/retired/anki-search-pending.json',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/anki/search-requests/pending',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800' },
          { key: 'Content-Type', value: 'application/json; charset=utf-8' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: 'bro.snap-ortho.com',
          },
        ],
        destination: 'https://snap-ortho.com/reference/case-prep',
        permanent: true,
      },
      {
        source: '/privacy-policy',
        destination: '/privacy',
        permanent: true,
      },
      {
        source: '/terms-of-use',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/terms-and-conditions',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/eula',
        destination: '/terms',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
