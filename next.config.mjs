/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['argon2']
  },
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com']
  }
}

export default nextConfig
