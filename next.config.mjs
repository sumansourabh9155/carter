/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Reporting was folded into Insights. Its channel/campaign content is
      // the "Channels" view; everything else moved to the surface that owned
      // the question (Products, Audience & Funnel, Integrations). Kept as a
      // redirect rather than a deletion because bookmarks, the pitch deck and
      // anything the assistant cited before the merge still point here.
      { source: "/reporting", destination: "/insights?view=channels", permanent: false },
    ];
  },
};

export default nextConfig;
