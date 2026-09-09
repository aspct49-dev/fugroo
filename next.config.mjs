/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Leave `ws` to Node rather than bundling it.
   *
   * `ws/lib/buffer-util.js` does an optional `require('bufferutil')` inside a
   * try/catch and falls back to its own JS masking when that throws. Bundled,
   * the require does not throw — webpack resolves the missing optional
   * dependency to an empty stub — so the fallback never installs and
   * `bufferUtil.mask` is undefined. Every frame of 48 bytes or more then
   * throws, which is the Pusher subscribe payload, so the Kick chat socket
   * died the instant it opened and took the process with it as an
   * uncaughtException.
   *
   * Marking the package external restores the real require, and with it the
   * intended fallback. Installing `bufferutil` would also work, but it is a
   * native build on every machine and every deploy for a socket that carries
   * chat messages.
   */
  serverExternalPackages: ['ws'],
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
      // Bonus hunts was retired. Guess the balance is the section that asks
      // the same question of the same round, so anything linking to the old
      // path — a Discord pin, a stream panel — lands somewhere sensible.
      { source: '/bonus-hunts', destination: '/guess-the-balance', permanent: true },
    ];
  },
};

export default nextConfig;
