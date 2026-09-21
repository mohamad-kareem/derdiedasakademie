import { Plus, UserCog } from "lucide-react";
import { PageHeader, EmptyState, Breadcrumb } from "@/components/ui/Blocks";
import { StatusBadge } from "@/components/ui/Badges";
import Avatar from "@/components/ui/Avatar";
import FormModal from "@/components/admin/FormModal";
import { StaffFields } from "@/components/admin/Fields";
import StaffRowActions from "@/components/admin/StaffRowActions";
import { requireOwner } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import { saveStaff } from "@/app/actions/admin";
import { formatDate, plain } from "@/lib/utils";

/**
 * The people who work here. The owner's page: colleagues are created, given a
 * role, suspended or removed from here, and each row shows how many courses
 * that person is currently responsible for.
 */
export default async function StaffPage() {
  const me = await requireOwner();
  const { t, locale } = await getI18n();
  await connectDB();

  const staff = plain(
    await User.find({ role: { $in: ["owner", "teacher", "admin"] } })
      .sort({ role: 1, name: 1 })
      .lean(),
  );
  const counts = await Course.aggregate([
    { $match: { teacher: { $ne: null } } },
    { $group: { _id: "$teacher", n: { $sum: 1 } } },
  ]);
  const load = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

  return (
    <>
      <PageHeader
        title={t("admin.nav.staff")}
        description={t("admin.staff.subtitle")}
        actions={
          <FormModal
            trigger={<><Plus className="size-3.5" /> {t("admin.staff.new")}</>}
            title={t("admin.staff.new")}
            action={saveStaff.bind(null, null)}
            submitLabel={t("admin.staff.create")}
          >
            <StaffFields t={t} creating />
          </FormModal>
        }
      >
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.staff")]} />
      </PageHeader>

      <div className="card overflow-hidden">
        {staff.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("admin.staff.person")}</th>
                  <th>{t("admin.staff.role")}</th>
                  <th>{t("admin.staff.courses")}</th>
                  <th>{t("admin.students.joined")}</th>
                  <th>{t("admin.fields.status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => {
                  const owner = person.role === "owner" || person.role === "admin";
                  return (
                    <tr key={person._id} className="hover:bg-canvas/40">
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={person.name} avatarKey={person.avatarKey} size={30} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-navy-900">
                              {person.name}
                              {person._id === me.id && <span className="ms-1.5 text-[11px] font-normal text-muted">({t("classroom.you")})</span>}
                            </p>
                            <p className="truncate text-[11.5px] text-muted" dir="ltr">{person.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12.5px] font-medium text-ink">{t(`admin.staff.roles.${owner ? "owner" : "teacher"}`)}</span>
                        {person.title && <p className="text-[11.5px] text-muted">{person.title}</p>}
                      </td>
                      <td className="tabular">{owner ? "—" : load[person._id] || 0}</td>
                      <td className="tabular">{formatDate(person.createdAt, locale)}</td>
                      <td><StatusBadge status={person.isActive === false ? "cancelled" : "active"} label={t(person.isActive === false ? "admin.staff.suspended" : "status.active")} /></td>
                      <td className="text-end">
                        {person._id !== me.id && <StaffRowActions person={person} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<UserCog />} title={t("admin.staff.emptyTitle")} text={t("admin.staff.emptyText")} />
        )}
      </div>
    </>
  );
}
