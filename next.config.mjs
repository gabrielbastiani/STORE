// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  
  images: {
    domains: [
      'img.youtube.com',       // Para miniaturas do YouTube
      'vumbnail.com',          // Para miniaturas do Vimeo
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ]
  }
}

export default nextConfig;