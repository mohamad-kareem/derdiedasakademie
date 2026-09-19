import SiteShell from "@/components/site/SiteShell";
import LevelTest from "@/components/site/LevelTest";
import { getI18n } from "@/lib/i18n/server";
import { publicQuestions } from "@/lib/level-test";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("test.title"), description: t("test.subtitle") };
}

export default async function LevelTestPage() {
  const { t } = await getI18n();
  // Questions only — the answer key stays on the server until the test is graded.
  const questions = publicQuestions();

  return (
    <SiteShell>
      <section className="border-b border-line bg-cream">
        <div className="container-page py-10">
          <p className="eyebrow">{t("test.eyebrow")}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold tracking-tight text-navy-900">{t("test.title")}</h1>
          <div className="mt-3 h-[3px] w-20 flag-stripe" />
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">{t("test.subtitle")}</p>
        </div>
      </section>

      <section className="py-10">
        <div className="container-page max-w-4xl">
          <LevelTest questions={questions} />
        </div>
      </section>
    </SiteShell>
  );
}
