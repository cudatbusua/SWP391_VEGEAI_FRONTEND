'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Đã có lỗi xảy ra!</h2>
        <button onClick={() => reset()}>Thử lại</button>
      </body>
    </html>
  );
}
