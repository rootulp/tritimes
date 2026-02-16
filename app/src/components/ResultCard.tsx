interface Props {
  label: string;
  value: string;
  subtext?: string;
}

export default function ResultCard({ label, value, subtext }: Props) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 text-center">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );
}
