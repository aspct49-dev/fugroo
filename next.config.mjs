/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Roobet serves player tier badges from its own CDN.
    remotePatterns: [
      // Roobet serves player tier badges from its own CDN.
      { protocol: 'https', hostname: 'roobet.com' },
      // Discord serves account avatars from theirs.
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
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
