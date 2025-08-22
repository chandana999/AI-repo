const nextConfig = {
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/api/:path*",
            destination: "http://localhost:8000/api/:path*",
          },
        ]
      : [
          {
            source: "/api/:path*",
            destination: "https://ai-repo-2-vjx6.onrender.com/api/:path*",
         },
        ];
  },
};

module.exports = nextConfig;
