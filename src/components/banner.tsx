export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-black/10 bg-black/[0.03] dark:border-white/15 dark:bg-white/5",
    error:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  } as const;

  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}
