import { Inter, Playfair_Display, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/I18nProvider";
import Toaster from "@/components/ui/Toaster";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: { default: `${site.name} — ${t("meta.tagline")}`, template: `%s · ${site.shortName}` },
    description: t("meta.description"),
    icons: { icon: "/logo/try.png" },
  };
}

export default async function RootLayout({ children }) {
  const { locale, dir, dict } = await getI18n();
  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${playfair.variable} ${plexArabic.variable}`}>
      <body className="min-h-screen">
        <I18nProvider locale={locale} dict={dict}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
