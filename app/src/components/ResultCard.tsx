interface Props {
  label: string;
  value: string;
  subtext?: string;
}

export default function ResultCard({ label, value, subtext }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
    </div>
  );
}
