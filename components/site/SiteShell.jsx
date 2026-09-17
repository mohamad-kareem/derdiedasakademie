import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { getCurrentUser } from "@/lib/auth";
import { safe } from "@/lib/data";

export default async function SiteShell({ children }) {
  const user = await safe(getCurrentUser(), null);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user ? { name: user.name, role: user.role } : null} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
