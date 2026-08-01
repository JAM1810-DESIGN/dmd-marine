import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** A valid bcrypt hash of no real password — compared against on login when the email isn't found, so the response takes the same time either way. */
export const DUMMY_PASSWORD_HASH = "$2b$12$BccvS9Ol.sqvHnm6euvXS.iEQGNwArswBBBZTjUcDau4AyQJdha2.";
