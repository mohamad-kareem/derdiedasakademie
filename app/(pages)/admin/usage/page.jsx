import { Video, Database, HardDrive, Clock3, CalendarCheck2, Users, Gauge, TriangleAlert, Terminal } from "lucide-react";
import { PageHeader, StatCard, Panel, EmptyState } from "@/components/ui/Blocks";
import { LevelBadge } from "@/components/ui/Badges";
import { Meter, DayBars, Num, usageState } from "@/components/admin/UsageBlocks";
import { requireAdmin } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { getUsageReport } from "@/lib/usage";
import { formatBytes, formatDateTime, formatMinutes, formatNumber } from "@/lib/utils";

export default async function AdminUsagePage() {
  await requireAdmin();
  const { t, locale } = await getI18n();
  const { storage, traffic, teaching, bytesPerPersonMinute } = await getUsageReport();

  const stateLabel = (percent) => t(`admin.usage.state.${usageState(percent)}`);

  const disk = traffic.ok && traffic.system?.diskTotalBytes
    ? {
        total: traffic.system.diskTotalBytes,
        used: traffic.system.diskTotalBytes - (traffic.system.diskFreeBytes || 0),
      }
    : null;
  const diskPercent = disk ? Math.round(((disk.used / disk.total) * 1000)) / 10 : 0;

  return (
    <>
      <PageHeader title={t("admin.usage.title")} description={t("admin.usage.subtitle")} />

      {/* ---------------------------------------------------------- allowances */}
      <div className="grid gap-4 lg:grid-cols-3">
        {traffic.ok ? (
          <Meter
            locale={locale}
            icon={<Video className="size-4 text-navy-700" />}
            label={t("admin.usage.traffic.label")}
            valueText={formatBytes(traffic.monthTxBytes, locale)}
            limitText={formatBytes(traffic.limitBytes, locale, 0)}
            percent={traffic.percent}
            stateLabel={stateLabel(traffic.percent)}
            hint={t("admin.usage.traffic.hint", { today: formatBytes(traffic.todayTxBytes, locale) })}
          />
        ) : (
          <section className="card flex items-start gap-3 p-4 lg:col-span-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
              <TriangleAlert className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">
                {traffic.configured === false ? t("admin.usage.traffic.notSetUp") : t("admin.usage.traffic.unreachable")}
              </p>
              <p className="mt-1 text-xs text-muted">
                {traffic.configured === false ? t("admin.usage.traffic.notSetUpText") : traffic.error}
              </p>
              {traffic.configured === false && (
                <code className="mt-2 flex items-center gap-1.5 overflow-x-auto rounded-md bg-canvas px-2 py-1.5 text-[11px] text-ink">
                  <Terminal className="size-3 shrink-0" />
                  sudo bash ~/video-server/usage-setup.sh
                </code>
              )}
            </div>
          </section>
        )}

        {storage.ok ? (
          <Meter
            locale={locale}
            icon={<Database className="size-4 text-navy-700" />}
            label={t("admin.usage.db.label")}
            valueText={formatBytes(storage.dbUsedBytes, locale)}
            limitText={formatBytes(storage.dbLimitBytes, locale, 0)}
            percent={storage.dbPercent}
            stateLabel={stateLabel(storage.dbPercent)}
            hint={t("admin.usage.db.hint", { files: formatNumber(storage.fileCount, locale), size: formatBytes(storage.fileBytes, locale) })}
          />
        ) : (
          <section className="card p-4">
            <p className="text-sm font-semibold text-navy-900">{t("admin.usage.db.label")}</p>
            <p className="mt-1 text-xs text-muted">{storage.error}</p>
          </section>
        )}

        {disk && (
          <Meter
            locale={locale}
            icon={<HardDrive className="size-4 text-navy-700" />}
            label={t("admin.usage.disk.label")}
            valueText={formatBytes(disk.used, locale)}
            limitText={formatBytes(disk.total, locale, 0)}
            percent={diskPercent}
            stateLabel={stateLabel(diskPercent)}
            hint={t("admin.usage.disk.hint")}
          />
        )}
      </div>

      {/* ------------------------------------------------------------ teaching */}
      {teaching.ok && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("admin.usage.stats.personMinutes")}
            value={<Num>{formatMinutes(teaching.personMinutes, locale)}</Num>}
            icon={<Clock3 className="size-5" />}
            hint={t("admin.usage.stats.personMinutesHint")}
          />
          <StatCard
            label={t("admin.usage.stats.classMinutes")}
            value={<Num>{formatMinutes(teaching.classMinutes, locale)}</Num>}
            icon={<Gauge className="size-5" />}
            tone="gold"
            hint={t("admin.usage.stats.classMinutesHint")}
          />
          <StatCard
            label={t("admin.usage.stats.classes")}
            value={formatNumber(teaching.lessonsHeld, locale)}
            icon={<CalendarCheck2 className="size-5" />}
            hint={t("admin.usage.stats.classesHint", { n: formatNumber(teaching.lessonsAttended, locale) })}
          />
          <StatCard
            label={t("admin.usage.stats.learners")}
            value={formatNumber(teaching.learners, locale)}
            icon={<Users className="size-5" />}
            tone="green"
            hint={t("admin.usage.stats.classSizeHint", { n: formatNumber(teaching.averageClassSize, locale) })}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* --------------------------------------------------- daily traffic */}
          {traffic.ok && (
            <Panel title={t("admin.usage.traffic.daily")}>
              <DayBars days={traffic.days} locale={locale} emptyText={t("admin.usage.traffic.empty")} />
            </Panel>
          )}

          {/* ------------------------------------------------------- what it costs */}
          <Panel title={t("admin.usage.insight.title")} bodyClassName="divide-y divide-line">
            {traffic.ok ? (
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  {t("admin.usage.insight.projection", {
                    amount: formatBytes(traffic.projectedBytes, locale),
                    percent: formatNumber(traffic.projectedPercent, locale),
                  })}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t("admin.usage.insight.projectionText", { day: traffic.dayOfMonth, days: traffic.daysInMonth })}
                </p>
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-sm text-muted">{t("admin.usage.insight.noTraffic")}</p>
              </div>
            )}

            {bytesPerPersonMinute != null && (
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  {t("admin.usage.insight.perMinute", { size: formatBytes(bytesPerPersonMinute, locale) })}
                </p>
                <p className="mt-1 text-xs text-muted">{t("admin.usage.insight.perMinuteText")}</p>
              </div>
            )}

            {storage.ok && storage.leftoverChunkBytes > 0 && (
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  {t("admin.usage.insight.leftovers", { size: formatBytes(storage.leftoverChunkBytes, locale) })}
                </p>
                <p className="mt-1 text-xs text-muted">{t("admin.usage.insight.leftoversText")}</p>
              </div>
            )}
          </Panel>

          {/* ------------------------------------------------------- big files */}
          {storage.ok && (
            <Panel title={t("admin.usage.largest.title")} className="overflow-x-auto">
              {storage.largest.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("admin.usage.largest.file")}</th>
                      <th className="w-28">{t("admin.usage.largest.size")}</th>
                      <th className="w-40">{t("admin.usage.largest.uploaded")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storage.largest.map((f) => (
                      <tr key={f.key}>
                        <td className="max-w-0 truncate font-medium text-ink">{f.name}</td>
                        <td className="whitespace-nowrap text-muted"><Num>{formatBytes(f.bytes, locale)}</Num></td>
                        <td className="whitespace-nowrap text-muted">{f.uploadedAt ? formatDateTime(f.uploadedAt, locale) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title={t("admin.usage.largest.empty")} />
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {/* -------------------------------------------------- where files sit */}
          {storage.ok && (
            <Panel title={t("admin.usage.areas.title")} bodyClassName="divide-y divide-line">
              {storage.areas.length ? (
                storage.areas.map((a) => (
                  <div key={a.area} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{t(`admin.usage.area.${a.area}`)}</p>
                      <p className="text-xs text-muted">{t(a.count === 1 ? "admin.usage.areas.file" : "admin.usage.areas.files", { n: formatNumber(a.count, locale) })}</p>
                    </div>
                    <Num className="shrink-0 text-sm font-semibold text-navy-900">{formatBytes(a.bytes, locale)}</Num>
                  </div>
                ))
              ) : (
                <EmptyState title={t("admin.usage.areas.empty")} />
              )}
            </Panel>
          )}

          {/* ------------------------------------------------- busiest courses */}
          {teaching.ok && (
            <Panel title={t("admin.usage.courses.title")} bodyClassName="divide-y divide-line">
              {teaching.courses.length ? (
                teaching.courses.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.level && <LevelBadge level={c.level} />}
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{c.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {t("admin.usage.courses.line", {
                        minutes: formatMinutes(c.personMinutes, locale),
                        learners: formatNumber(c.learners, locale),
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title={t("admin.usage.courses.empty")} />
              )}
            </Panel>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        {traffic.ok && traffic.generatedAt
          ? t("admin.usage.updated", { time: formatDateTime(traffic.generatedAt, locale), since: traffic.countingSince || "—" })
          : t("admin.usage.updatedDbOnly")}
      </p>
    </>
  );
}
