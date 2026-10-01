import crypto from "node:crypto";
import User from "@/models/User";

/**
 * The ticket that lets somebody set a password without having one.
 *
 * It is used for both halves of the same problem: a person who has forgotten
 * their password, and a colleague who has never had one. The mechanism is the
 * same, so there is one of it.
 *
 * What is stored is a hash, never the ticket itself. Somebody who reads the
 * database therefore cannot let themselves in — which matters more here than
 * usual, since the database also holds the lessons and the files.
 */

const RESET_MINUTES = 60;
const INVITE_DAYS = 7;

const hashOf = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

/** Issue a ticket for this account and return it. Any earlier one stops working. */
export async function issueToken(userId, { days = 0, minutes = RESET_MINUTES } = {}) {
  const token = crypto.randomBytes(32).toString("hex");
  const life = days ? days * 24 * 60 * 60000 : minutes * 60000;
  await User.updateOne({ _id: userId }, { resetTokenHash: hashOf(token), resetExpires: new Date(Date.now() + life) });
  return token;
}

export const issueInvite = (userId) => issueToken(userId, { days: INVITE_DAYS });

/** The account a ticket belongs to, or null if it is unknown, used or stale. */
export async function accountForToken(token) {
  if (typeof token !== "string" || token.length !== 64) return null;
  const user = await User.findOne({ resetTokenHash: hashOf(token), resetExpires: { $gt: new Date() } })
    .select("+resetTokenHash +resetExpires name email role isActive locale")
    .lean();
  return user || null;
}

/** Spend the ticket. Called the moment the new password is written. */
export async function clearToken(userId) {
  await User.updateOne({ _id: userId }, { $unset: { resetTokenHash: "", resetExpires: "" } });
}
