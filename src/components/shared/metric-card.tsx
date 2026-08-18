import { Card } from "@/components/ui/card";

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-brand-emerald">{value}</p>
    </Card>
  );
}
