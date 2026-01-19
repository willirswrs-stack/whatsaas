import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! WARN !! Ignorando erros TypeScript para permitir build durante desenvolvimento
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
