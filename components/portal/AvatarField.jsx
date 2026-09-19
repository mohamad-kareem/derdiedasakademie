"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import Avatar, { avatarSrc } from "@/components/ui/Avatar";
import { useI18n } from "@/components/I18nProvider";
import { toast } from "@/components/ui/Toaster";
import { uploadFile } from "@/lib/upload-client";
import { setAvatar, clearAvatar } from "@/app/actions/student";

/**
 * Choosing a portrait. The picture is shown from the moment it is chosen — a
 * local preview while it travels — so the person sees the result rather than a
 * progress figure, and the stored copy takes over once it is saved.
 */
export default function AvatarField({ user }) {
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [key, setKey] = useState(user.avatarKey || "");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  async function choose(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setBusy(true);
    try {
      const { key: uploaded } = await uploadFile(file, { scope: "avatar" });
      const res = await setAvatar(uploaded);
      if (!res?.ok) throw new Error(res?.error || "files.uploadFailed");
      setKey(uploaded);
      setPreview(null); // the stored copy takes over from the local preview
      toast(t("profile.photoSaved"));
    } catch (err) {
      toast(t(String(err.message).includes(".") ? err.message : "files.uploadFailed"), "error");
      setPreview(null);
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  async function remove() {
    setBusy(true);
    const res = await clearAvatar();
    setBusy(false);
    if (!res?.ok) return toast(t(res?.error || "errors.somethingWrong"), "error");
    setKey("");
    setPreview(null);
    toast(t("profile.photoRemoved"));
  }

  const shown = preview || avatarSrc(key);

  return (
    <div className="flex items-center gap-4 border-b border-line pb-5">
      <span className="relative">
        {shown ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={shown} alt={user.name} className="size-[72px] rounded-[3px] border border-line object-cover" />
        ) : (
          <Avatar name={user.name} size={72} className="rounded-[3px]" />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-[3px] bg-navy-950/45">
            <Loader2 className="size-5 animate-spin text-white" />
          </span>
        )}
      </span>

      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-navy-900">{t("profile.photo")}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">{t("profile.photoHint")}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn btn-outline btn-sm">
            <Camera className="size-3.5" /> {key || preview ? t("profile.photoChange") : t("profile.photoUpload")}
          </button>
          {(key || preview) && (
            <button type="button" onClick={remove} disabled={busy} className="btn btn-ghost btn-sm text-red-700">
              <Trash2 className="size-3.5" /> {t("profile.photoRemove")}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic" onChange={choose} className="hidden" />
      </div>
    </div>
  );
}
