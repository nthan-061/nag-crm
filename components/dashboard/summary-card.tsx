import { Card } from "@/components/ui/card";

export function SummaryCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-accent">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-secondary">{helper}</p>
    </Card>
  );
}
