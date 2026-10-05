export function EmptyNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <p className="text-base font-semibold tracking-tight">{title}</p>
      <p className="mx-auto max-w-prose text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
