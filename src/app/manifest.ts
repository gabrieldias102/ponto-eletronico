import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pontual",
    short_name: "Pontual",
    description: "Registro de ponto eletrônico",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d9488",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
