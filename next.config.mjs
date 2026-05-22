/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [process.env.IP_ADDRESS],
};

export default nextConfig;
