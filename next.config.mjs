/** @type {import('next').NextConfig} */
const nextConfig = {
  // فتح البوابة على كل أجهزة الشبكة المحلية (LAN / نفس الواي فاي)
  allowedDevOrigins: ['192.168.1.2', '192.168.1.6', '192.168.1.50', '192.168.1.51', '192.168.1.52', '192.168.1.53'],
};

export default nextConfig;
