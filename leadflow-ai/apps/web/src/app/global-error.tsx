"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: "system-ui", padding: 40 }}>
        <h1>Произошла ошибка</h1>
        <p>Попробуйте обновить страницу. Подробности записаны в лог сервера.</p>
        <button onClick={() => reset()}>Повторить</button>
      </body>
    </html>
  );
}
