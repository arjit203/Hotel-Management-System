/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/booking-confirmation/:reference",
        destination: "/hotel/booking/confirmation/:reference",
        permanent: true,
      },
      {
        source: "/hotel/rooms/:roomSlug/book",
        destination: "/hotel/booking?room=:roomSlug",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
