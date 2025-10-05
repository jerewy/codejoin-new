import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PROJECT_NAME_ADJECTIVES = [
  "Agile",
  "Brilliant",
  "Creative",
  "Dynamic",
  "Eager",
  "Fearless",
  "Gentle",
  "Heroic",
  "Inventive",
  "Joyful",
  "Kind",
  "Lively",
  "Magnetic",
  "Nimble",
  "Optimistic",
  "Playful",
  "Quantum",
  "Radiant",
  "Spirited",
  "Tenacious",
  "Upbeat",
  "Vivid",
  "Whimsical",
  "Youthful",
  "Zealous",
];

const PROJECT_NAME_NOUNS = [
  "Aurora",
  "Beacon",
  "Canvas",
  "Circuit",
  "Comet",
  "Engine",
  "Forge",
  "Galaxy",
  "Harbor",
  "Horizon",
  "Idea",
  "Lantern",
  "Matrix",
  "Momentum",
  "Nexus",
  "Orbit",
  "Pulse",
  "Rocket",
  "Spark",
  "Studio",
  "Synth",
  "Telescope",
  "Vertex",
  "Workshop",
  "Zenith",
];

function stableHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateFriendlyProjectName(projectId: string): string {
  const trimmed = projectId?.trim();

  if (!trimmed) {
    return "Untitled Project";
  }

  const hash = stableHash(trimmed);
  const adjective =
    PROJECT_NAME_ADJECTIVES[hash % PROJECT_NAME_ADJECTIVES.length];
  const noun = PROJECT_NAME_NOUNS[(hash >> 8) % PROJECT_NAME_NOUNS.length];
  const suffix = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();

  return suffix
    ? `${adjective} ${noun} ${suffix}`
    : `${adjective} ${noun}`;
}
