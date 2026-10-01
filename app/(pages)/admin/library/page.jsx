import Link from "next/link";
import { Library, HardDrive, Trash2, ServerOff, Info, FolderOpen, ChevronDown } from "lucide-react";
import { PageHeader, Breadcrumb, Panel, EmptyState } from "@/components/ui/Blocks";
import ActionButton from "@/components/ui/ActionButton";
import AttachmentList from "@/components/files/AttachmentList";
import ShelfUploader from "@/components/admin/ShelfUploader";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import { removeShelfFile, clearOldShelf } from "@/app/actions/library";
import { countByLevel, isMaterialConfigured, materialIndex, MATERIAL_MAX_MB, shelfFor } from "@/lib/material";
import { filesUnder, isStorageConfigured } from "@/lib/storage";
import { LEVELS } from "@/lib/constants";
import { formatBytes } from "@/lib/files-client";
import { cn } from "@/lib/utils";

const ROOT = "/srv/ddd-material";

/**
 * The academy's library: one shelf per level, read from the material folder
 * on the classroom server.
 *
 * Whole levels are copied onto the server directly; this page shows what is
 * there, lets Bilal add the odd file or take one away, and says plainly how
 * much room it all takes and how much is left.
 */
export default async function LibraryPage({ searchParams }) {
  const user = await requireStaff();
  const { t } = await getI18n();
  const params = await searchParams;
  await connectDB();

  const level = LEVELS.includes(params?.level) ? params.level : LEVELS[0];
  const mayEdit = can(user, "resources.manage");
  const owner = can(user, "system.settings");
  const configured = isMaterialConfigured();

  const [index, courses, old] = await Promise.all([
    materialIndex(),
    Course.find({ status: { $ne: "archived" }, level }).select("_id").lean(),
    owner && isStorageConfigured() ? filesUnder("library/").catch(() => null) : null,
  ]);
  const counts = countByLevel(index);
  const shelf = index.ok ? shelfFor(index, level) : [];
  const total = shelf.reduce((n, s) => n + s.files.length, 0);

  return (
    <>
      <PageHeader title={t("library.academyTitle")} description={t("library.academySubtitle")}>
        <Breadcrumb trail={[t("admin.portal"), t("library.academyTitle")]} />
      </PageHeader>

      {/* ------------------------------------------- left over from version one */}
      {old?.keys?.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-[3px] border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center">
          <Info className="size-4 shrink-0 text-amber-700" />
          <div className="flex-1 text-[12.5px] text-amber-900">
            <p className="font-semibold">{t("library.oldShelfTitle")}</p>
            <p>{t("library.oldShelfText", { n: old.keys.length, size: formatBytes(old.bytes) })}</p>
          </div>
          <ActionButton action={clearOldShelf} confirm className="btn-outline btn-sm">
            <Trash2 className="size-3.5" /> {t("library.oldShelfRemove")}
          </ActionButton>
        </div>
      )}

      {/* ------------------------------------------------------ not switched on */}
      {!configured ? (
        <EmptyState
          icon={<ServerOff className="size-5" />}
          title={t("library.offTitle")}
          text={t(owner ? "library.offText" : "library.offTeacher")}
        />
      ) : (
        <>
          {!index.ok && (
            <p className="mb-4 flex items-start gap-2 rounded-[3px] border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-800">
              <ServerOff className="mt-0.5 size-4 shrink-0" /> {t("library.unreachable")}
            </p>
          )}
          {index.stale && (
            <p className="mb-4 flex items-start gap-2 rounded-[3px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900">
              <ServerOff className="mt-0.5 size-4 shrink-0" /> {t("library.stale")}
            </p>
          )}

          {/* ------------------------------------------------------- the shelves */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto">
              {LEVELS.map((l) => (
                <Link
                  key={l}
                  href={`/admin/library?level=${l}`}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-[12.5px] font-medium",
                    l === level ? "bg-navy-900 text-white" : "border border-line bg-paper text-muted hover:bg-cream hover:text-navy-900",
                  )}
                >
                  {l}
                  <span className={cn("text-[10.5px] tabular", l === level ? "text-white/60" : "text-muted/70")}>{counts[l]}</span>
                </Link>
              ))}
            </div>
            {index.ok && (
              <p className="ms-auto inline-flex items-center gap-1.5 text-[11.5px] text-muted">
                <HardDrive className="size-3.5" />
                {t("library.inUse", {
                  size: `⁦${formatBytes(index.bytes) || "0 B"}⁩`,
                  free: `⁦${index.disk ? formatBytes(index.disk.free) : "?"}⁩`,
                })}
              </p>
            )}
          </div>

          <p className="mb-4 text-[12.5px] text-muted">
            {courses.length > 0
              ? t("library.sharedWith", { level, n: courses.length })
              : t("library.sharedWithNone", { level })}
          </p>

          {mayEdit && index.ok && (
            <Panel title={t("library.addFiles")} className="mb-5" bodyClassName="p-4">
              <ShelfUploader key={level} level={level} sections={shelf.map((s) => ({ folder: s.folder }))} maxMb={MATERIAL_MAX_MB} />
            </Panel>
          )}

          {/* --------------------------------------------------------- the files */}
          {total > 0 ? (
            <div className="space-y-5">
              {shelf.map((s) => (
                <Panel
                  key={s.folder || "general"}
                  title={
                    <span className="inline-flex items-center gap-2">
                      {s.title || t("library.general")}
                      <span className="text-[11px] font-normal normal-case tracking-normal text-muted">
                        {t("library.fileCount", { n: s.files.length })} · <span dir="ltr">{formatBytes(s.bytes)}</span>
                      </span>
                    </span>
                  }
                  bodyClassName="divide-y divide-line"
                >
                  {(() => {
                    const rows = s.files.map((f) => (
                      <div key={f.rel} className="flex items-start gap-2 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <AttachmentList files={[f]} t={t} dense />
                          <p className="mt-1 truncate ps-1 text-[10.5px] text-muted/80" dir="ltr">{f.rel}</p>
                        </div>
                        {mayEdit && (
                          <ActionButton action={removeShelfFile.bind(null, f.rel)} confirm title={t("common.delete")}>
                            <Trash2 className="size-3.5" />
                          </ActionButton>
                        )}
                      </div>
                    ));
                    // A whole CD of tracks stays folded until asked for.
                    if (s.files.length <= 12) return rows;
                    return (
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[12.5px] font-medium text-navy-700 hover:bg-cream [&::-webkit-details-marker]:hidden">
                          <ChevronDown className="size-3.5 -rotate-90 transition group-open:rotate-0 rtl:rotate-90 rtl:group-open:rotate-0" />
                          {t("library.showFiles", { n: s.files.length })}
                        </summary>
                        <div className="divide-y divide-line border-t border-line">{rows}</div>
                      </details>
                    );
                  })()}
                </Panel>
              ))}
            </div>
          ) : (
            index.ok && (
              <EmptyState
                icon={<Library className="size-5" />}
                title={t("library.shelfEmpty", { level })}
                text={t("library.shelfEmptyText", { level })}
              />
            )
          )}

          {owner && (
            <p className="mt-5 flex items-start gap-2 text-[11.5px] text-muted">
              <FolderOpen className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {t("library.whereHint")} <code className="rounded-[2px] bg-canvas px-1 py-0.5 text-[11px]" dir="ltr">{`${ROOT}/${level}/`}</code>
              </span>
            </p>
          )}
        </>
      )}
    </>
  );
}

export const dynamic = "force-dynamic";
