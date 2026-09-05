import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "תיבת הדילמות",
    short_name: "תיבה",
    description: "שאלות ודילמות מקצועיות למתנדבים",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#F4F2EC",
    theme_color: "#D9601A",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
