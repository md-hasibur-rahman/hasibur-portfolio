import type { MetadataRoute } from "next";

// The icon files are full-bleed portrait crops, so they are declared "any": claiming "maskable"
// would invite Android to crop a circle that clips the top of the head.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hasibur Rahman",
    short_name: "Hasibur",
    description: "Personal portfolio with secure accounts, messaging and an admin dashboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#040b21",
    theme_color: "#040b21",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
