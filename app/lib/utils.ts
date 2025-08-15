import { nanoid } from "nanoid";

const adjectives = [
  "Cuddly",
  "Fluffy",
  "Snuggly",
  "Sweet",
  "Cozy",
  "Bubbly",
  "Sparkly",
  "Fuzzy",
  "Giggly",
  "Huggy",
  "Bouncy",
  "Silly",
  "Merry",
  "Cutie",
  "Peppy",
  "Dreamy",
  "Sunny",
  "Puffy",
  "Tiny",
  "Rosy",
  "Perky",
  "Jolly",
  "Lovey",
  "Peachy",
  "Blushy",
];

const nouns = [
  "Pookie",
  "Bean",
  "Muffin",
  "Cookie",
  "Bun",
  "Dumpling",
  "Pudding",
  "Cupcake",
  "Jellybean",
  "Fluff",
  "Pumpkin",
  "Button",
  "Bunny",
  "Kitten",
  "Panda",
  "Bubbles",
  "Sprinkle",
  "Honeybee",
  "Marshmallow",
  "Peanut",
  "Biscuit",
  "Noodle",
  "Nugget",
  "Teacup",
  "Cherub",
];

export const emojis = [
  "🐨",
  "🐱",
  "🐰",
  "🦊",
  "🦁",
  "🐶",
  "🐹",
  "🦄",
  "🐷",
  "🦋",
  "🌈",
  "✨",
  "💫",
  "💕",
  "💖",
  "🍰",
  "🧁",
  "🍭",
  "🍬",
  "🦔",
  "🐭",
  "🐣",
  "🐢",
  "🐬",
  "🐙",
  "🦉",
  "🦖",
  "🦒",
  "🦓",
];

export const generateRandomIdentity = () => {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  return {
    name: `${adjective} ${noun}`,
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
