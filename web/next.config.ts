import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // URL específica para el túnel de Cloud Shell en el puerto 8080
  allowedDevOrigins: [
    "8080-cs-5edf3677-8ab1-4945-bd88-46342531447e.cs-us-east1-pkhd.cloudshell.dev"
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.cloudshell.dev",
        "*.googleusercontent.com",
        "localhost:8080"
      ],
    },
  },
};

export default nextConfig;
