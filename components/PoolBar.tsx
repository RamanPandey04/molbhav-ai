import clsx from "clsx";

/** Progress to the supplier minimum. Marigold while short, green once reached. */
export function PoolBar({ qty, moq, onDark = false }: { qty: number; moq: number | null; onDark?: boolean }) {
  if (moq == null)
    return (
      <div className="pt-1">
        <p className={clsx("text-[13px] font-semibold", onDark ? "text-white/80" : "text-ink-soft")}>Supplier minimum unknown until a quote arrives</p>
        <div role="progressbar" aria-label={`${qty} units pooled, supplier minimum unknown`} aria-valuemin={0} aria-valuenow={qty}
          className={clsx("mt-2 h-3 rounded-full", onDark ? "bg-white/15" : "bg-ink/10")} />
      </div>
    );
  const total = Math.max(qty, moq);
  const fill = Math.min(100, (qty / total) * 100);
  const moqAt = (moq / total) * 100;
  const reached = qty >= moq;
  const label = reached ? `${qty} units pooled, supplier minimum of ${moq} reached` : `${qty} units pooled, ${moq - qty} short of the supplier minimum of ${moq}`;
  return (
    <div className="relative pt-7">
      <div className={clsx("absolute top-0 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold", onDark ? "text-white/80" : "text-ink-soft")} style={{ left: `${Math.min(Math.max(moqAt, 16), 84)}%` }}>
        Minimum {moq}
      </div>
      <div
        role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={qty}
        className={clsx("relative h-3 overflow-hidden rounded-full", onDark ? "bg-white/15" : "bg-ink/10")}
      >
        <div className={clsx("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", reached ? "bg-[#3DD6A0]" : "bg-turmeric")} style={{ width: `${fill}%` }} />
      </div>
      <div className={clsx("absolute bottom-[-5px] h-5 w-[3px] rounded", onDark ? "bg-white" : "bg-ink")} style={{ left: `calc(${moqAt}% - 1.5px)` }} aria-hidden />
    </div>
  );
}
