// Function to check if a username is reserved
export function isReservedUsername(username: string): boolean {
  const reservedUsernames = ["avmaurya07", "admin", "administrator", "system"];
  return reservedUsernames.includes(username.toLowerCase());
}
