/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The API sets these through helmet; the Next apps sent none. No CSP here on
  // purpose — GTM / Facebook Pixel / Razorpay Checkout would each need a
  // reviewed allowlist, so a blind policy would break payments.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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
