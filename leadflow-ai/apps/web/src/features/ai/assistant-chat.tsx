"use client";

import type { AssistantReply } from "@leadflow/shared";
import { ArrowUp, Bot, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askAssistantAction } from "./actions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: AssistantReply["suggestedActions"];
  mode?: "live" | "demo";
}

/** Безопасный мини-рендер markdown: только **жирный**, _курсив_ и списки. HTML не интерпретируется. */
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("_") && part.endsWith("_") && part.length > 2 ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  return (
    <div className="flex flex-col gap-1.5 text-sm leading-relaxed">
      {lines.map((l, i) =>
        /^\s*[-•]\s+/.test(l) ? (
          <div key={i} className="flex gap-2 pl-1">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{inline(l.replace(/^\s*[-•]\s+/, ""))}</span>
          </div>
        ) : l.trim() ? (
          <p key={i}>{inline(l)}</p>
        ) : (
          <div key={i} className="h-1" />
        ),
      )}
    </div>
  );
}

function actionHref(a: AssistantReply["suggestedActions"][number]): string | null {
  if (!a.companyId && a.kind !== "none") return null;
  switch (a.kind) {
    case "open_company":
    case "rescore":
    case "create_task":
      return `/companies/${a.companyId}`;
    case "generate_proposal":
      return `/proposals/new?companyId=${a.companyId}`;
    case "draft_message":
      return `/messages?compose=${a.companyId}`;
    default:
      return null;
  }
}

const PROMPTS_COMPANY = ["Объясни Score", "Предложи следующий шаг", "Кратко перескажи историю клиента", "Подготовь ответ на возражение «дорого»"];
const PROMPTS_ORG = ["Проанализируй эффективность продаж за 30 дней", "Каких лидов стоит обработать первыми?", "Где теряются клиенты в воронке?"];

export function AssistantChat({ companies, initialCompanyId, mode }: { companies: Array<{ id: string; name: string }>; initialCompanyId?: string; mode: "live" | "demo" | "unavailable" }) {
  const [companyId, setCompanyId] = useState(initialCompanyId ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    const res = await askAssistantAction({ message: msg, companyId: companyId || null, history });
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      setMessages((m) => [...m, { role: "assistant", content: `Ошибка: ${res.error}` }]);
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: res.data.reply.answer, actions: res.data.reply.suggestedActions, mode: res.data.mode }]);
  };

  return (
    <Card className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <span className="text-sm font-medium">Контекст:</span>
        <Select value={companyId || "__org"} onValueChange={(v) => { setCompanyId(v === "__org" ? "" : v); setMessages([]); }}>
          <SelectTrigger className="w-[320px]" size="sm" aria-label="Контекст ассистента">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__org">Все продажи организации</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant={mode === "live" ? "success" : "demo"} className="ml-auto">
          {mode === "live" ? "Claude API" : mode === "demo" ? "DEMO: правила без AI" : "AI недоступен"}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 pt-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-soft">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold">AI-ассистент по продажам</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Анализирует данные CRM и предлагает действия. Ассистент ничего не отправляет и не изменяет сам — все действия подтверждаете вы.
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {(companyId ? PROMPTS_COMPANY : PROMPTS_ORG).map((p) => (
                <Button key={p} variant="outline" size="sm" onClick={() => send(p)} disabled={mode === "unavailable"}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[9px]", m.role === "user" ? "bg-muted" : "bg-accent text-primary")}>
                {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
              </span>
              <div className={cn("max-w-[85%] rounded-[14px] px-4 py-3", m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card")}>
                {m.role === "user" ? <div className="text-sm whitespace-pre-wrap">{m.content}</div> : <Markdown text={m.content} />}
                {m.actions?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                    {m.actions.map((a, j) => {
                      const href = actionHref(a);
                      return href ? (
                        <Button key={j} asChild size="sm" variant="outline">
                          <Link href={href}>{a.label}</Link>
                        </Button>
                      ) : null;
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {loading ? (
            <div className="flex gap-3">
              <span className="flex size-7 items-center justify-center rounded-[9px] bg-accent text-primary">
                <Bot className="size-4" />
              </span>
              <div className="flex items-center gap-1 rounded-[14px] border bg-card px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>
      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            className="max-h-40 min-h-10 resize-none"
            placeholder={mode === "unavailable" ? "AI недоступен — добавьте ключ или включите DEMO_MODE" : "Спросите про клиента или продажи…"}
            disabled={mode === "unavailable"}
            aria-label="Сообщение ассистенту"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim() || mode === "unavailable"} aria-label="Отправить">
            <ArrowUp />
          </Button>
        </div>
      </form>
    </Card>
  );
}
