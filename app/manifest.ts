import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "אני רק שאלה...",
    short_name: "רק שאלה",
    description: "שאלות ודילמות מקצועיות למתנדבים",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#FFFFFF",
    theme_color: "#F26E2D",
    icons: [
      { src: "/api/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
