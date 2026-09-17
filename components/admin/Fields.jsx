import { LEVELS, RESOURCE_CATEGORIES } from "@/lib/constants";
import FileUploader from "@/components/files/FileUploader";

import { toLocalInput, cn } from "@/lib/utils";

function F({ label, hint, full, children }) {
  return (
    <label className={cn("block", full && "sm:col-span-2")}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint block">{hint}</span>}
    </label>
  );
}

export function CourseFields({ t, course = {} }) {
  return (
    <>
      <F label={`${t("admin.fields.title")} *`} full>
        <input name="title" required defaultValue={course.title} className="input" placeholder={t("admin.fields.titlePlaceholder")} />
      </F>
      <F label={`${t("admin.fields.level")} *`}>
        <select name="level" defaultValue={course.level || "A1"} className="input">
          {LEVELS.map((l) => <option key={l} value={l}>{l} · {t(`levels.${l}.name`)}</option>)}
        </select>
      </F>
      <F label={t("admin.fields.format")}>
        <select name="format" defaultValue={course.format || "group"} className="input">
          {["group", "private", "intensive"].map((f) => <option key={f} value={f}>{t(`format.${f}`)}</option>)}
        </select>
      </F>
      <F label={`${t("admin.fields.startDate")} *`}>
        <input type="date" name="startDate" required defaultValue={toLocalInput(course.startDate, true)} className="input" />
      </F>
      <F label={`${t("admin.fields.endDate")} *`}>
        <input type="date" name="endDate" required defaultValue={toLocalInput(course.endDate, true)} className="input" />
      </F>
      <F label={t("admin.fields.schedule")} hint={t("admin.fields.scheduleHint")} full>
        <input name="schedule" defaultValue={course.schedule} className="input" placeholder="Mon & Wed · 18:00–19:30" />
      </F>
      <F label={t("admin.fields.price")}>
        <div className="flex">
          <input type="number" name="price" min="0" step="1" defaultValue={course.price ?? 0} className="input rounded-e-none" />
          <select name="currency" defaultValue={course.currency || "EUR"} className="input w-24 rounded-s-none border-s-0">
            {["EUR", "USD", "GBP", "CHF", "EGP", "SAR", "AED", "JOD", "IQD", "TRY"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </F>
      <F label={t("admin.fields.capacity")}>
        <input type="number" name="capacity" min="1" defaultValue={course.capacity ?? 12} className="input" />
      </F>
      <F label={t("admin.fields.classroom")} hint={t("admin.fields.classroomHint")} full>
        <select name="classroom" defaultValue={course.classroom || "builtin"} className="input">
          <option value="builtin">{t("admin.fields.classroomBuiltin")}</option>
          <option value="external">{t("admin.fields.classroomExternal")}</option>
        </select>
      </F>
      <F label={t("admin.fields.meetingUrl")} hint={t("admin.fields.meetingUrlHint")} full>
        <input name="meetingUrl" defaultValue={course.meetingUrl} className="input" placeholder="https://zoom.us/j/…" dir="ltr" />
      </F>
      <F label={t("admin.fields.description")} full>
        <textarea name="description" rows={4} defaultValue={course.description} className="input" />
      </F>
      <F label={t("admin.fields.status")} full>
        <select name="status" defaultValue={course.status || "draft"} className="input">
          {["draft", "published", "archived"].map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
      </F>
    </>
  );
}

export function LessonFields({ t, lesson = {}, courseId, storage }) {
  return (
    <>
      <F label={`${t("admin.fields.title")} *`} full>
        <input name="title" required defaultValue={lesson.title} className="input" placeholder={t("admin.fields.lessonPlaceholder")} />
      </F>
      <F label={`${t("admin.fields.startsAt")} *`} hint={t("admin.fields.timezoneHint")}>
        <input type="datetime-local" name="startsAt" required defaultValue={toLocalInput(lesson.startsAt)} className="input" />
      </F>
      <F label={t("admin.fields.duration")}>
        <input type="number" name="durationMin" min="15" step="5" defaultValue={lesson.durationMin ?? 90} className="input" />
      </F>
      <F label={t("admin.fields.lessonMeetingUrl")} hint={t("admin.fields.lessonMeetingHint")} full>
        <input name="meetingUrl" defaultValue={lesson.meetingUrl} className="input" dir="ltr" placeholder="https://" />
      </F>
      <F label={t("admin.fields.description")} full>
        <textarea name="description" rows={3} defaultValue={lesson.description} className="input" />
      </F>
      <div className="sm:col-span-2">
        <span className="label">{t("admin.fields.files")}</span>
        <FileUploader scope="materials" courseId={courseId} initial={lesson.attachments || []} enabled={storage} />
      </div>
      <F label={t("admin.fields.materials")} hint={t("admin.fields.materialsHint")} full>
        <textarea
          name="materials"
          rows={3}
          defaultValue={(lesson.materials || []).map((m) => `${m.title} | ${m.url}`).join("\n")}
          className="input font-mono text-xs"
          dir="ltr"
          placeholder={"Worksheet Lektion 3 | https://drive.google.com/...\nVocabulary list | https://..."}
        />
      </F>
    </>
  );
}

export function AssignmentFields({ t, assignment = {}, courseId, storage, lessons = [] }) {
  return (
    <>
      <F label={`${t("admin.fields.title")} *`} full>
        <input name="title" required defaultValue={assignment.title} className="input" />
      </F>
      <F label={t("admin.fields.dueDate")} hint={t("admin.fields.timezoneHint")}>
        <input type="datetime-local" name="dueDate" defaultValue={toLocalInput(assignment.dueDate)} className="input" />
      </F>
      <F label={t("admin.fields.maxPoints")}>
        <input type="number" name="maxPoints" min="1" defaultValue={assignment.maxPoints ?? 100} className="input" />
      </F>
      <F label={t("admin.fields.instructions")} full>
        <textarea name="instructions" rows={6} defaultValue={assignment.instructions} className="input" />
      </F>
      <div className="sm:col-span-2">
        <span className="label">{t("admin.fields.files")}</span>
        <FileUploader scope="assignments" courseId={courseId} initial={assignment.attachments || []} enabled={storage} />
      </div>
      <F label={t("admin.fields.resourceUrl")}>
        <input name="resourceUrl" defaultValue={assignment.resourceUrl} className="input" dir="ltr" placeholder="https://" />
      </F>
      <F label={t("admin.fields.linkedSession")}>
        <select name="lesson" defaultValue={assignment.lesson || ""} className="input">
          <option value="">—</option>
          {lessons.map((l) => <option key={l._id} value={l._id}>{l.title}</option>)}
        </select>
      </F>
    </>
  );
}

export function AnnouncementFields({ t, announcement = {}, courses = [], fixedCourseId, storage }) {
  return (
    <>
      <F label={`${t("admin.fields.title")} *`} full>
        <input name="title" required defaultValue={announcement.title} className="input" />
      </F>
      {fixedCourseId ? (
        <input type="hidden" name="course" value={fixedCourseId} />
      ) : (
        <F label={t("admin.fields.audience")} full>
          <select name="course" defaultValue={announcement.course?._id || announcement.course || ""} className="input">
            <option value="">{t("announcements.everyone")}</option>
            {courses.map((c) => <option key={c._id} value={c._id}>{c.level} · {c.title}</option>)}
          </select>
        </F>
      )}
      <F label={t("admin.fields.message")} full>
        <textarea name="body" rows={5} defaultValue={announcement.body} className="input" />
      </F>
      {fixedCourseId && (
        <div className="sm:col-span-2">
          <span className="label">{t("admin.fields.files")}</span>
          <FileUploader scope="announcements" courseId={fixedCourseId} initial={announcement.attachments || []} enabled={storage} max={5} compact />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="pinned" defaultChecked={announcement.pinned} className="size-4 accent-navy-900" />
        {t("admin.fields.pinned")}
      </label>
    </>
  );
}

export function ResourceFields({ t, resource = {}, courseId, storage, lessons = [] }) {
  return (
    <>
      <F label={`${t("admin.fields.title")} *`} full>
        <input name="title" required defaultValue={resource.title} className="input" placeholder={t("library.titlePlaceholder")} />
      </F>
      <F label={t("library.category")}>
        <select name="category" defaultValue={resource.category || "worksheet"} className="input">
          {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`library.categories.${c}`)}</option>)}
        </select>
      </F>
      <F label={t("admin.fields.linkedSession")}>
        <select name="lesson" defaultValue={resource.lesson || ""} className="input">
          <option value="">—</option>
          {lessons.map((l) => <option key={l._id} value={l._id}>{l.title}</option>)}
        </select>
      </F>
      <div className="sm:col-span-2">
        <span className="label">{t("admin.fields.files")}</span>
        <FileUploader scope="resources" courseId={courseId} initial={resource.attachments || []} enabled={storage} />
      </div>
      <F label={t("library.orLink")} full>
        <input name="url" defaultValue={resource.url} className="input" dir="ltr" placeholder="https://youtube.com/…" />
      </F>
      <F label={t("admin.fields.description")} full>
        <textarea name="description" rows={3} defaultValue={resource.description} className="input" />
      </F>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="visible" defaultChecked={resource.visible ?? true} className="size-4 accent-navy-900" />
        {t("library.visible")}
      </label>
    </>
  );
}
