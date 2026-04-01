import { BankOffer } from "@/types";

export default function BankPopup({
  offer,
  onClose,
  onSelect,
}: {
  offer: BankOffer | null;
  onClose: () => void;
  onSelect: (offer: BankOffer) => void;
}) {
  if (!offer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Bank details</p>
            <h3 className="mt-2 text-2xl font-bold">{offer.bank}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2">
            Close
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          {offer.terms.map((term) => (
            <div key={term.label} className="grid grid-cols-[0.9fr_1.1fr] border-b border-slate-100 p-4 text-sm last:border-b-0">
              <div className="font-medium text-slate-600">{term.label}</div>
              <div>{term.value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onSelect(offer)}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Select this offer
        </button>
      </div>
    </div>
  );
}