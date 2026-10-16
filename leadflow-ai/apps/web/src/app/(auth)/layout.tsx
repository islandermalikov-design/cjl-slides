import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-soft">
              <Zap className="size-4" fill="currentColor" />
            </span>
            <span className="text-lg font-semibold tracking-tight">LeadFlow AI</span>
          </div>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 lg:flex">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.25)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative flex flex-col justify-end p-12 text-white">
          <div className="max-w-md">
            <div className="text-[28px] leading-tight font-semibold tracking-tight">От поиска клиента до закрытой сделки — в одной системе</div>
            <ul className="mt-6 space-y-2.5 text-sm text-blue-100/90">
              <li>Поиск компаний из разрешённых источников и импорт CSV/XLSX</li>
              <li>AI-оценка лидов с разделением фактов и гипотез</li>
              <li>Коммерческие предложения с PDF и версиями</li>
              <li>Согласование сообщений и защита от нежелательных рассылок</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
