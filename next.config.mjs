/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [process.env.IP_ADDRESS],
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      './dist/**/*',
      './electron/**/*',
      './docs/**/*',
      './scripts/**/*',
      './.next/cache/**/*',
    ],
  },
};

export default nextConfig;
