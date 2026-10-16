"use client";

import { Command } from "cmdk";
import { Building, FileText, Handshake, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NAV } from "./nav";

interface SearchResults {
  companies: Array<{ id: string; name: string; city: string | null }>;
  contacts: Array<{ id: string; fullName: string; companyId: string; company: { name: string } }>;
  proposals: Array<{ id: string; title: string }>;
  deals: Array<{ id: string; title: string; companyId: string }>;
}

const EMPTY: SearchResults = { companies: [], contacts: [], proposals: [], deals: [] };

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* отменено */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };
  const shown = q.trim().length >= 2 ? results : EMPTY;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-[10px] border bg-card px-2.5 text-[13px] text-muted-foreground shadow-soft transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Поиск компаний, контактов, КП…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Глобальный поиск</DialogTitle>
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                autoFocus
                placeholder="Название компании, email, ИНН, КП…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading ? <span className="text-xs text-muted-foreground">Поиск…</span> : null}
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                {q.trim().length < 2 ? "Введите минимум 2 символа" : "Ничего не найдено"}
              </Command.Empty>
              {q.trim().length < 2 ? (
                <Command.Group heading="Разделы" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {NAV.flatMap((s) => s.items).map((item) => (
                    <SearchItem key={item.href} onSelect={() => go(item.href)} icon={<item.icon className="size-4" />} label={item.title} />
                  ))}
                </Command.Group>
              ) : null}
              {shown.companies.length ? (
                <Command.Group heading="Компании" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {shown.companies.map((c) => (
                    <SearchItem key={c.id} onSelect={() => go(`/companies/${c.id}`)} icon={<Building className="size-4" />} label={c.name} hint={c.city ?? undefined} />
                  ))}
                </Command.Group>
              ) : null}
              {shown.contacts.length ? (
                <Command.Group heading="Контакты" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {shown.contacts.map((c) => (
                    <SearchItem key={c.id} onSelect={() => go(`/companies/${c.companyId}`)} icon={<User className="size-4" />} label={c.fullName} hint={c.company.name} />
                  ))}
                </Command.Group>
              ) : null}
              {shown.proposals.length ? (
                <Command.Group heading="КП" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {shown.proposals.map((p) => (
                    <SearchItem key={p.id} onSelect={() => go(`/proposals/${p.id}`)} icon={<FileText className="size-4" />} label={p.title} />
                  ))}
                </Command.Group>
              ) : null}
              {shown.deals.length ? (
                <Command.Group heading="Сделки" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                  {shown.deals.map((d) => (
                    <SearchItem key={d.id} onSelect={() => go(`/companies/${d.companyId}`)} icon={<Handshake className="size-4" />} label={d.title} />
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchItem({ onSelect, icon, label, hint }: { onSelect: () => void; icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-2 text-sm text-foreground data-[selected=true]:bg-muted"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </Command.Item>
  );
}
