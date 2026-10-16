"use client";

import { IMPORT_TARGET_LABELS, ImportColumnTargets, type ImportColumnTarget } from "@leadflow/shared";
import { CircleCheck, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { previewImportAction, runImportAction } from "./actions";

interface Preview {
  fileName: string;
  headers: string[];
  sample: string[][];
  totalRows: number;
  mapping: Record<string, ImportColumnTarget | "skip">;
}

interface ImportResult {
  status: string;
  importedRows: number;
  duplicateRows: number;
  skippedRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }> | null;
}

export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportColumnTarget | "skip">>({});
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const step = result ? 3 : preview ? 2 : 1;

  async function onFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Файл больше 5 МБ");
      return;
    }
    setFile(f);
    setLoading(true);
    const fd = new FormData();
    fd.set("file", f);
    const res = await previewImportAction(fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      setFile(null);
      return;
    }
    setPreview(res.data);
    setMapping(res.data.mapping);
  }

  async function runImport() {
    if (!file) return;
    if (!Object.values(mapping).includes("name")) {
      toast.error("Сопоставьте столбец «Название компании»");
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mapping", JSON.stringify(mapping));
    fd.set("tags", tags);
    const res = await runImportAction(fd);
    if (!res.ok) {
      setLoading(false);
      toast.error(res.error);
      return;
    }
    // Ожидаем завершения (задание может выполняться worker-процессом).
    for (let i = 0; i < 120; i++) {
      const r = await fetch(`/api/imports/${res.data.importJobId}`);
      if (r.ok) {
        const data = (await r.json()) as ImportResult;
        if (data.status === "SUCCEEDED" || data.status === "FAILED") {
          setResult(data);
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setLoading(false);
  }

  const usedTargets = new Set(Object.values(mapping).filter((v) => v !== "skip"));

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {["Файл", "Предпросмотр и сопоставление", "Результат"].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-semibold", step > i + 1 ? "bg-success text-white" : step === i + 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
              {step > i + 1 ? <CircleCheck className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(step === i + 1 ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < 2 ? <span className="mx-1 h-px w-8 bg-border" /> : null}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const f = e.dataTransfer.files[0];
                if (f) void onFile(f);
              }}
              className={cn("flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-14 text-center transition-colors", drag ? "border-primary bg-accent" : "border-border")}
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-[12px] bg-accent text-primary">
                <FileSpreadsheet className="size-6" />
              </div>
              <div className="font-medium">{loading ? "Чтение файла…" : "Перетащите файл CSV или XLSX"}</div>
              <div className="mt-1 text-sm text-muted-foreground">До 5 МБ и 10 000 строк. Первая строка — заголовки столбцов. Кодировка CSV: UTF-8 или Windows-1251.</div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
                data-testid="import-file"
              />
              <Button className="mt-4" onClick={() => inputRef.current?.click()} disabled={loading}>
                <Upload /> Выбрать файл
              </Button>
            </div>
            <Alert variant="info" className="mt-4">
              <AlertTitle>Импортируйте только законно полученные данные</AlertTitle>
              <AlertDescription>
                Деловые контакты компаний из открытых источников с указанием URL источника. Формулы в ячейках (=, +, @) автоматически нейтрализуются.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 && preview ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Сопоставление столбцов</CardTitle>
              <CardDescription>
                {preview.fileName} · строк: {preview.totalRows}. Проверьте, какие столбцы куда загружаются. Дубли (по ИНН, домену, email, телефону, названию+городу) будут пропущены.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preview.headers.map((h) => (
                <div key={h} className="flex flex-col gap-1.5 rounded-[10px] border p-3">
                  <div className="truncate text-sm font-medium" title={h}>
                    {h}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">Пример: {preview.sample[0]?.[preview.headers.indexOf(h)] || "—"}</div>
                  <Select value={mapping[h] ?? "skip"} onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v as ImportColumnTarget | "skip" }))}>
                    <SelectTrigger size="sm" aria-label={`Поле для столбца ${h}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Не импортировать —</SelectItem>
                      {ImportColumnTargets.map((t) => (
                        <SelectItem key={t} value={t} disabled={usedTargets.has(t) && mapping[h] !== t}>
                          {IMPORT_TARGET_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Предпросмотр</CardTitle>
              <CardDescription>Первые {preview.sample.length} строк</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.headers.map((h) => (
                    <TableHead key={h}>
                      <div>{h}</div>
                      <div className="font-normal text-primary">{mapping[h] && mapping[h] !== "skip" ? IMPORT_TARGET_LABELS[mapping[h] as ImportColumnTarget] : "пропуск"}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.sample.map((row, i) => (
                  <TableRow key={i}>
                    {preview.headers.map((h, j) => (
                      <TableCell key={h} className={cn("max-w-[220px] truncate text-[13px]", (!mapping[h] || mapping[h] === "skip") && "text-muted-foreground/60")}>
                        {row[j]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="import-tags">Теги для всех импортированных компаний (необязательно)</Label>
                <Input id="import-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Импорт октябрь, Выставка" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setPreview(null); setFile(null); }} disabled={loading}>
                  Другой файл
                </Button>
                <Button onClick={runImport} disabled={loading}>
                  {loading ? "Импорт…" : `Импортировать ${preview.totalRows} строк`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {step === 3 && result ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className={cn("flex size-11 items-center justify-center rounded-[12px]", result.status === "SUCCEEDED" ? "bg-green-50 text-success dark:bg-green-500/10" : "bg-red-50 text-destructive")}>
                <CircleCheck className="size-5" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold">{result.status === "SUCCEEDED" ? "Импорт завершён" : "Импорт завершился с ошибкой"}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Добавлено", result.importedRows],
                    ["Дублей пропущено", result.duplicateRows],
                    ["Пустых строк", result.skippedRows],
                    ["Ошибок", result.errorRows],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-[10px] border p-3">
                      <div className="text-xs text-muted-foreground">{l}</div>
                      <div className="text-xl font-semibold tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                {result.errors?.length ? (
                  <div className="mt-4 max-h-48 overflow-y-auto rounded-[10px] border p-3 text-sm">
                    {result.errors.slice(0, 50).map((e, i) => (
                      <div key={i} className="text-muted-foreground">
                        Строка {e.row}: {e.message}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 flex gap-2">
                  <Button asChild>
                    <Link href="/companies?sort=createdAt&order=desc">Открыть базу компаний</Link>
                  </Button>
                  <Button variant="outline" onClick={() => { setResult(null); setPreview(null); setFile(null); }}>
                    Импортировать ещё
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
