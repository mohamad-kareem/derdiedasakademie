import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Logo({ href = "/", dark = false, compact = false, className }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3", className)} dir="ltr" aria-label="Die DerDieDas Akademie">
      {/* On dark grounds the mark is used in its knockout form — white letterforms,
          flag colours kept — so it sits on the masthead without a white plate. */}
      <Image
        src={dark ? "/logo/mark-light.png" : "/logo/mark.png"}
        alt=""
        width={480}
        height={200}
        priority
        className={cn("w-auto", dark ? "h-[22px]" : "h-7")}
      />
      {!compact && (
        <span className={cn("flex flex-col border-s ps-3 leading-none", dark ? "border-white/15" : "border-line")}>
          <span className={cn("text-[15px] font-bold tracking-tight", dark ? "text-white" : "text-navy-900")} style={{ fontFamily: "var(--font-display)" }}>
            Die DerDieDas
          </span>
          <span className={cn("mt-1 text-[9px] font-semibold uppercase tracking-[0.3em]", dark ? "text-gold-400" : "text-gold-500")}>
            Akademie
          </span>
        </span>
      )}
    </Link>
  );
}
