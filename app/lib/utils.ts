import { nanoid } from "nanoid";

const adjectives = [
  "Swift",
  "Clever",
  "Bright",
  "Wise",
  "Bold",
  "Calm",
  "Deep",
  "Elite",
  "Fine",
  "Free",
  "Grand",
  "Happy",
  "Kind",
  "Neat",
  "Pure",
  "Safe",
  "Smart",
  "Tech",
  "Vivid",
  "Zoom",
];

const nouns = [
  "Pixel",
  "Byte",
  "Cloud",
  "Data",
  "Echo",
  "Flow",
  "Grid",
  "Hash",
  "Input",
  "Java",
  "Kernel",
  "Logic",
  "Macro",
  "Node",
  "Orbit",
  "Pulse",
  "Query",
  "React",
  "Stack",
  "Tech",
];

const emojis = [
  "🚀",
  "💻",
  "🎮",
  "🎯",
  "🎨",
  "🎭",
  "🎪",
  "🎢",
  "🎡",
  "🎠",
  "🌟",
  "⭐",
  "✨",
  "💫",
  "🌈",
  "🌊",
  "🌍",
  "🌞",
  "🌙",
  "⚡",
];

export const generateRandomIdentity = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return {
    name: `${adjective}${noun}`,
    emoji: emoji,
    id: nanoid(),
  };
};

export const generateInviteLink = (isOneTime: boolean = false) => {
  return {
    code: nanoid(10),
    isOneTime,
    usedBy: [],
    createdAt: new Date(),
  };
};
