import { EVModel } from "@/types";

interface Props {
  models: EVModel[];
  selectedA: string;
  selectedB: string;
  onSelectA: (value: string) => void;
  onSelectB: (value: string) => void;
}

export default function CompareHero({ models, selectedA, selectedB, onSelectA, onSelectB }: Props) {
  const handleSwap = () => {
    const temp = selectedA;
    onSelectA(selectedB);
    onSelectB(temp);
  };

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-semibold text-blue-600">Compare EVs</p>
        <h1 className="mt-2 text-4xl font-bold">Compare electric vehicles side by side</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
          <select
            value={selectedA}
            onChange={(e) => onSelectA(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="">Choose first EV</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.brand} {model.model}
              </option>
            ))}
          </select>

          <button
            onClick={handleSwap}
            className="flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 hover:bg-slate-100"
            title="Swap selections"
          >
            ⇄
          </button>

          <select
            value={selectedB}
            onChange={(e) => onSelectB(e.target.value)}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="">Choose second EV</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.brand} {model.model}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}