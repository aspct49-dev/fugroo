/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Roobet serves player tier badges from its own CDN.
    remotePatterns: [{ protocol: 'https', hostname: 'roobet.com' }],
  },
  async redirects() {
    return [
      // Raffles became Giveaways. Anything already linking to the old path —
      // a Discord pin, a stream panel — keeps working.
      { source: '/raffles', destination: '/giveaways', permanent: true },
    ];
  },
};

export default nextConfig;
