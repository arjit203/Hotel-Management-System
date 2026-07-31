const VARIANTS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  checked_in: "bg-blue-50 text-blue-700 border-blue-200",
  checked_out: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function Badge({ status }: { status: string }) {
  const style = VARIANTS[status] || "bg-beige text-warmgray border-beige";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-body text-xs capitalize ${style}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
