import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookA } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/Blocks";
import VocabPractice from "@/components/portal/VocabPractice";
import { requireStudent } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { canUseCourse } from "@/lib/access";
import { isId } from "@/lib/validate";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import VocabItem from "@/models/VocabItem";
import { plain } from "@/lib/utils";

export default async function VocabularyPage({ params }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const user = await requireStudent();
  const { t } = await getI18n();
  await connectDB();
  if (!(await canUseCourse(user, id))) notFound();
  const [course, items] = await Promise.all([Course.findById(id).select("title level").lean(), VocabItem.find({ course: id }).sort({ createdAt: 1 }).lean()]);

  return (
    <>
      <Link href={`/dashboard/courses/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy-900">
        <ArrowLeft className="size-4 rtl:rotate-180" /> {course?.title}
      </Link>
      <PageHeader title={t("vocab.title")} description={t("vocab.subtitle", { n: items.length })} />
      {items.length ? <VocabPractice items={plain(items)} /> : <div className="card"><EmptyState icon={<BookA className="size-5" />} title={t("vocab.empty")} /></div>}
    </>
  );
}
