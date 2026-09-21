import { Plus, Megaphone, Pin, Pencil, Trash2 } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { LevelBadge } from "@/components/ui/Badges";
import FormModal from "@/components/admin/FormModal";
import ActionButton from "@/components/ui/ActionButton";
import { AnnouncementFields } from "@/components/admin/Fields";
import { requireStaff } from "@/lib/auth";
import { isOwner, ownCoursesFilter, teaches, portalKey } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import Announcement from "@/models/Announcement";
import Course from "@/models/Course";
import { saveAnnouncement, deleteAnnouncement } from "@/app/actions/admin";
import { formatDateTime, plain } from "@/lib/utils";

export default async function AnnouncementsPage() {
  const user = await requireStaff();
  const { t, locale } = await getI18n();
  await connectDB();
  const owner = isOwner(user);

  // A teacher may write to their own courses; only the owner addresses the
  // whole academy, so that is also all a teacher is offered here.
  const mineDocs = await Course.find({ status: { $ne: "archived" }, ...ownCoursesFilter(user) }).select("title level teacher").sort({ startDate: -1 }).lean();
  const mineIds = mineDocs.map((c) => String(c._id));

  const [items, courses] = plain(
    await Promise.all([
      Announcement.find(owner ? {} : { course: { $in: mineDocs.map((c) => c._id) } })
        .populate("course", "title level")
        .sort({ pinned: -1, createdAt: -1 })
        .limit(200)
        .lean(),
      mineDocs,
    ]),
  );
  const editable = (a) => owner || (a.course && mineIds.includes(String(a.course._id)));

  return (
    <>
      <PageHeader
        title={t("admin.nav.announcements")}
        description={t("admin.announcements.subtitle")}
        actions={
          <FormModal trigger={<><Plus className="size-4" /> {t("admin.announcements.new")}</>} title={t("admin.announcements.new")} action={saveAnnouncement.bind(null, null)} submitLabel={t("admin.announcements.publish")}>
            <AnnouncementFields t={t} courses={courses} everyone={owner} />
          </FormModal>
        }
      >
        <Breadcrumb trail={[t(portalKey(user)), t("admin.nav.announcements")]} />
      </PageHeader>
      <div className="card divide-y divide-line">
        {items.length ? items.map((a) => (
          <div key={a._id} className="flex gap-4 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[3px] bg-navy-50 text-navy-700">{a.pinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{a.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {a.course ? <><LevelBadge level={a.course.level} /> {a.course.title}</> : <span className="badge bg-gold-50 text-gold-600">{t("announcements.everyone")}</span>}
                · {formatDateTime(a.createdAt, locale)}
              </p>
              {a.body && <p className="prose-text mt-2 text-[13px]">{a.body}</p>}
            </div>
            <div className="flex items-start gap-1.5">
              {editable(a) && <FormModal trigger={<Pencil className="size-3.5" />} triggerClassName="btn-outline btn-sm" title={t("common.edit")} action={saveAnnouncement.bind(null, a._id)}>
                <AnnouncementFields t={t} announcement={a} courses={courses} everyone={owner} />
              </FormModal>}
              {editable(a) && <ActionButton action={deleteAnnouncement.bind(null, a._id)} confirm><Trash2 className="size-3.5" /></ActionButton>}
            </div>
          </div>
        )) : <EmptyState icon={<Megaphone className="size-5" />} title={t("student.overview.noAnnouncements")} text={t("admin.announcements.emptyText")} />}
      </div>
    </>
  );
}
