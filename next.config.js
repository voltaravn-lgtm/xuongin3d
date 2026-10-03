import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/compat-router.tsx',
    },
  },
  webpack: (config) => {
    config.resolve.alias['react-router-dom'] = path.resolve(process.cwd(), 'src/compat-router.tsx');
    return config;
  },
  async redirects() {
    return [
      { source: '/bao-hanh', destination: '/lien-he', permanent: true },
      { source: '/kich-hoat-bao-hanh', destination: '/lien-he', permanent: true },
      { source: '/dai-ly', destination: '/giai-phap', permanent: true },
      { source: '/dai-ly/dat-hang', destination: '/in-3d-theo-yeu-cau', permanent: true },
      { source: '/hoc-vien', destination: '/kien-thuc', permanent: true },
      { source: '/tuyen-dung', destination: '/gioi-thieu', permanent: true },
      { source: '/catalog', destination: '/san-pham', permanent: true },
    ];
  },
};

export default nextConfig;
