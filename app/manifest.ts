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
    background_color: "#F4F2EC",
    theme_color: "#F26E2D",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
