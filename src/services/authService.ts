import { randomBytes } from "crypto";
import { Session } from "../types";
import { Clock, systemClock } from "../lib/clock";
import { hashPassword, verifyPassword } from "../lib/password";
import { userRepo } from "../repositories/userRepo";
import { sessionRepo } from "../repositories/sessionRepo";

export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface Credentials {
  username: string;
  password: string;
}

export async function register({
  username,
  password,
}: Credentials): Promise<{ username: string }> {
  if (!username || !password)
    throw new Error("username and password are required");
  if (await userRepo.get(username)) throw new Error("username already taken");
  await userRepo.put({ username, passwordHash: await hashPassword(password) });
  return { username };
}

/**
 * Returns null for unknown username OR wrong password — callers must not be
 * able to tell which, so the 401 message never leaks whether a user exists.
 */
export async function login(
  { username, password }: Credentials,
  clock: Clock = systemClock,
): Promise<{ token: string; expiresAt: string } | null> {
  const user = await userRepo.get(username);
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    clock.now().getTime() + TOKEN_TTL_MS,
  ).toISOString();
  await sessionRepo.put({ token, username, expiresAt });
  return { token, expiresAt };
}

/** Valid strictly before expiresAt; expired sessions are left in the store. */
export async function verifyToken(
  token: string,
  clock: Clock = systemClock,
): Promise<Session | null> {
  const session = await sessionRepo.get(token);
  if (!session) return null;
  if (clock.now().getTime() >= new Date(session.expiresAt).getTime())
    return null;
  return session;
}
