"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { labelForPath, sectionForPath } from "./nav";

export function Breadcrumbs() {
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ href: string; label: string }> = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = labelForPath(acc);
    if (label) crumbs.push({ href: acc, label });
    else if (acc !== "/ai") crumbs.push({ href: acc, label: "Карточка" });
  }
  return (
    <nav aria-label="Навигационная цепочка" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      {section ? <span className="hidden text-muted-foreground sm:inline">{section.title}</span> : null}
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex min-w-0 items-center gap-1.5">
          {(section || i > 0) && <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:block" />}
          {i === crumbs.length - 1 ? (
            <span className="truncate font-medium text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="truncate text-muted-foreground hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
