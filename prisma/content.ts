// Portfolio copy is kept out of the page components so the dashboard can own it later.
// Every entry below describes a real project on this machine; nothing is invented, and links are
// left null until a public URL actually exists.

export type ContentProject = {
  title: string;
  slug: string;
  description: string;
  content: string;
  technologies: string[];
  featured?: boolean;
  sortOrder?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export const technologies = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Fastify",
  "PostgreSQL",
  "Prisma",
  "Auth.js",
  "Tailwind CSS",
  "Electron",
  "Rust",
  "Tauri",
  "SQLite",
  "Gemini API",
  "Groq",
  "Playwright",
  "Web Speech API",
  "Vite",
] as const;

export const projects: ContentProject[] = [
  {
    title: "Voice assistant with a Live2D avatar",
    slug: "live2d-voice-assistant",
    description:
      "A push-to-talk browser assistant that transcribes speech, answers through Groq, and speaks back over an animated Live2D character.",
    technologies: ["TypeScript", "React", "Groq", "Web Speech API"],
    sortOrder: 1,
    content: `## What it does
- Push-to-talk capture using the Web Speech API for recognition, no constant listening.
- Groq for low-latency answers, Edge-TTS for the reply voice.
- A Live2D model rendered with pixi-live2d-display reacts while the assistant speaks.

## Hardest part
Keeping the avatar, the transcript and the audio queue on the same timeline — the mouth state is driven by playback events rather than by text length guesses.`,
  },
  {
    title: "Hasibur Downloader",
    slug: "hasibur-downloader",
    description:
      "An Electron downloader wrapping yt-dlp, with a Manifest V3 browser extension that hands page media over to the desktop app.",
    technologies: ["TypeScript", "Electron", "Node.js"],
    sortOrder: 2,
    content: `## Pieces
- Electron shell with queue, progress and folder management.
- yt-dlp does the actual extraction and merging.
- A Manifest V3 extension captures media from the page and passes it to the local app.
- Optional encryption of finished files through a built-in local vault module.`,
  },
  {
    title: "Portfolio v1 — React + Fastify + PostgreSQL",
    slug: "portfolio-v1-fastify",
    description:
      "My first full portfolio: a Vite/React front end with a Fastify API, Firebase authentication, a contact inbox and an AI chat with provider fallback.",
    technologies: ["TypeScript", "React", "Vite", "Fastify", "Node.js", "PostgreSQL", "Gemini API", "Groq"],
    sortOrder: 3,
    content: `## Shape
- React Router 7 routes for home, projects, directory, chat, contact and an admin area.
- Fastify 5 API on PostgreSQL, deployed to Render from render.yaml.
- Firebase Auth for the session layer.
- Chat endpoint with Gemini first and Groq as fallback.

## What it taught me
The admin surface was protected by UI hiding rather than server checks — the reason this current rebuild starts from authentication, roles and audits before any page design.`,
  },
  {
    title: "This portfolio platform",
    slug: "secure-portfolio-platform",
    description:
      "The rebuild: Next.js App Router with Argon2id hashing, database-revocable sessions, role guards, audit logging, Cloudinary media and an AES-GCM vault.",
    technologies: ["TypeScript", "React", "Next.js", "PostgreSQL", "Prisma", "Auth.js", "Tailwind CSS"],
    status: "DRAFT",
    content: `Held back as a draft on purpose — it is the work in progress, and the public list should only show finished things.`,
  },
];
