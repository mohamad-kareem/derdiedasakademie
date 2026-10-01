"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { actionUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { LEVELS } from "@/lib/constants";
import { fail, done } from "@/lib/validate";
import { cleanSegment, extension, UPLOADABLE } from "@/lib/material-names";
import { forgetIndex, isMaterialConfigured, levelOf, materialIndex, MATERIAL_MAX_MB, removeFile, uploadUrl } from "@/lib/material";
import { deleteKeys, filesUnder } from "@/lib/storage";

/**
 * The academy's material lives as files on the classroom server. These actions
 * never carry a file themselves: they decide whether this person may add or
 * remove one, and hand the browser a signed address to send it to directly —
 * so a 100 MB recording goes from Bilal's computer to the server in one trip,
 * without passing through Vercel at all.
 */

async function guard() {
  const user = await actionUser("staff");
  if (!user || !can(user, "resources.manage")) return null;
  return user;
}

/**
 * files: [{ name, size }] → [{ name, rel, url } | { name, error }]
 * section "" puts the files straight into the level (shown as General).
 */
export async function prepareShelfUpload({ level, section, files }) {
  if (!(await guard())) return fail("errors.forbidden");
  if (!isMaterialConfigured()) return fail("library.errors.off");
  if (!LEVELS.includes(level)) return fail("errors.forbidden");
  if (!Array.isArray(files) || !files.length || files.length > 100) return fail("library.errors.failed");

  const index = await materialIndex();
  // Use an existing folder's name exactly as it is on the disk, so a section
  // copied from a Mac (which spells "ö" differently) is added to, not doubled.
  const wanted = cleanSegment(section, 80);
  const existing = (index.files || [])
    .map((f) => f.p.split("/"))
    .find((parts) => parts.length > 2 && levelOf(parts[0]) === level && parts[1].normalize("NFC") === wanted);
  const folder = existing ? existing[1] : wanted;
  const levelDir = (index.files || []).map((f) => f.p.split("/")[0]).find((d) => levelOf(d) === level) || level;
  const taken = new Set((index.files || []).map((f) => f.p.normalize("NFC").toLowerCase()));

  const out = files.map((f) => {
    const original = String(f?.name || "");
    const size = Number(f?.size);
    const ext = extension(original);
    if (!UPLOADABLE.includes(ext)) return { name: original, error: "library.errors.type" };
    if (!Number.isFinite(size) || size <= 0) return { name: original, error: "library.errors.failed" };
    if (size > MATERIAL_MAX_MB * 1024 * 1024) return { name: original, error: "library.errors.tooBig" };

    const stem = cleanSegment(original.slice(0, -(ext.length + 1)), 140) || "file";
    const dir = folder ? `${levelDir}/${folder}` : levelDir;
    // Never overwrite: a second "Lektion 3.pdf" becomes "Lektion 3 (2).pdf".
    let rel = `${dir}/${stem}.${ext}`;
    for (let n = 2; taken.has(rel.toLowerCase()) && n < 100; n += 1) rel = `${dir}/${stem} (${n}).${ext}`;
    taken.add(rel.toLowerCase());
    return { name: original, rel, url: uploadUrl(rel, size) };
  });
  return { ok: true, files: out };
}

/** After the browser has sent the files: show them straight away. */
export async function finishShelfUpload() {
  if (!(await guard())) return fail("errors.forbidden");
  forgetIndex();
  revalidatePath("/", "layout");
  return done("library.uploaded");
}

export async function removeShelfFile(rel) {
  if (!(await guard())) return fail("errors.forbidden");
  if (!isMaterialConfigured()) return fail("library.errors.off");
  if (typeof rel !== "string" || !levelOf(rel) || rel.includes("..")) return fail("errors.notFound");
  if (!(await removeFile(rel))) return fail("library.errors.unreachable");
  forgetIndex();
  revalidatePath("/", "layout");
  return done();
}

/* ---------------------------------------------------------------------------
 * The first version of the library kept material in the database. Anything
 * uploaded through it is no longer shown anywhere; this frees that room.
 * ------------------------------------------------------------------------- */

export async function clearOldShelf() {
  const user = await guard();
  if (!user || !can(user, "system.settings")) return fail("errors.forbidden");
  await connectDB();
  const { keys } = await filesUnder("library/");
  await deleteKeys(keys);
  await mongoose.connection.db.collection("materials").deleteMany({}).catch(() => {});
  revalidatePath("/admin/library");
  return done("library.oldShelfCleared");
}
