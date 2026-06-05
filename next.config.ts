import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config) {
    config.externals.push({ fs: 'commonjs fs', path: 'commonjs path' });
    return config;
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
