import { BadgeCheck } from "lucide-react";

function VerificationBadge({ status, compact = false }) {
  const verified = status === "verified" || status === "active";

  if (!verified) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 font-bold text-blue-700 shadow-sm shadow-blue-100 ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      <BadgeCheck size={compact ? 14 : 16} className="fill-blue-600 text-white" />
      Verified Property
    </span>
  );
}

export default VerificationBadge;
