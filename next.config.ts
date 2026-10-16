import type { NextConfig } from "next";

// Cache Components fica desligado: quase todas as telas dependem da sessão do usuário,
// então a renderização dinâmica padrão é mais simples e previsível (ver docs/arquitetura.md).
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
