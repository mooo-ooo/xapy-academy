export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 h-9 w-48 rounded-lg bg-[hsl(var(--hover))]" />
      <div className="mb-4 h-10 w-full max-w-md rounded-lg bg-[hsl(var(--hover))]" />
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-[hsl(var(--hover))]"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}
