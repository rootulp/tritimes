interface Props {
  label: string;
  value: string;
  subtext?: string;
}

export default function ResultCard({ label, value, subtext }: Props) {
  return (
    <div className="bg-surface rounded-lg border border-line p-4 text-center">
      <div className="text-sm text-secondary mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtext && <div className="text-xs text-muted mt-1">{subtext}</div>}
    </div>
  );
}
