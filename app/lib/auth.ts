import crypto from "crypto";

const SECRET_KEY = process.env.USER_AUTH_SECRET || "your-secret-key-here"; // Make sure to set this in your environment variables

// Function to create a signature
export function createSignature(
  userId: string,
  userName: string,
  userEmoji: string
): string {
  const data = `${userId}:${userName}:${userEmoji}`;
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
}

// Function to verify a signature
export function verifySignature(
  userId: string,
  userName: string,
  userEmoji: string,
  signature: string
): boolean {
  const expectedSignature = createSignature(userId, userName, userEmoji);
  return expectedSignature === signature;
}

interface UserData {
  signature: string;
  userId: string;
  userName: string;
  userEmoji: string;
}

// Function to verify user data
export function verifyUserData(data: Partial<UserData>): boolean {
  if (!data.signature || !data.userId || !data.userName || !data.userEmoji) {
    return false;
  }

  return verifySignature(
    data.userId,
    data.userName,
    data.userEmoji,
    data.signature
  );
}

// Function to check if a username is reserved
export function isReservedUsername(username: string): boolean {
  const reservedUsernames = ["avmaurya07", "admin", "administrator", "system"];
  return reservedUsernames.includes(username.toLowerCase());
}
