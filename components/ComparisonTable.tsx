import Link from "next/link";
import { useState } from "react";
import { EVModel } from "@/types";
import { evModels } from "@/data/evModels";

function winnerClass(left: number, right: number, lowerBetter = false, side: "left" | "right") {
  if (left === right) return "text-slate-900";
  const leftWins = lowerBetter ? left < right : left > right;
  const rightWins = lowerBetter ? right < left : right > left;
  if (side === "left" && leftWins) return "font-semibold text-emerald-600";
  if (side === "right" && rightWins) return "font-semibold text-emerald-600";
  return "text-slate-900";
}

export default function ComparisonTable({
  modelA,
  modelB,
}: {
  modelA: EVModel;
  modelB: EVModel;
}) {
  const [showCatalogueA, setShowCatalogueA] = useState(false);
  const [showCatalogueB, setShowCatalogueB] = useState(false);

  const specs = [
    { label: "Price", valueA: `£${modelA.price}`, valueB: `£${modelB.price}`, lowerBetter: true },
    { label: "Range", valueA: `${modelA.rangeKm} km`, valueB: `${modelB.rangeKm} km`, lowerBetter: false },
    { label: "Battery Capacity", valueA: `${modelA.batteryKWh} kWh`, valueB: `${modelB.batteryKWh} kWh`, lowerBetter: false },
    { label: "Torque", valueA: `${modelA.torqueNm} Nm`, valueB: `${modelB.torqueNm} Nm`, lowerBetter: false },
    { label: "Ground Clearance", valueA: `${modelA.groundClearanceMm} mm`, valueB: `${modelB.groundClearanceMm} mm`, lowerBetter: false },
    { label: "ADAS Features", valueA: modelA.adas, valueB: modelB.adas, lowerBetter: false },
    { label: "Description", valueA: modelA.description, valueB: modelB.description, lowerBetter: false },
  ];

  const brandModelsA = evModels.filter(m => m.brand === modelA.brand);
  const brandModelsB = evModels.filter(m => m.brand === modelB.brand);

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold">Detailed EV Comparison</h2>
        <p className="mt-2 text-slate-600">Compare specifications side by side to find your perfect EV</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Model A Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold text-blue-600">{modelA.brand} {modelA.model}</h3>
            <p className="mt-2 text-3xl font-bold">£{modelA.price.toLocaleString()}</p>
            <div className="mt-4 space-y-3">
              {specs.map((spec, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                  <span className="font-medium text-slate-700">{spec.label}</span>
                  <span className={`text-right ${winnerClass(modelA[spec.label.toLowerCase().replace(' ', '') as keyof EVModel] as number, modelB[spec.label.toLowerCase().replace(' ', '') as keyof EVModel] as number, spec.lowerBetter, "left")}`}>
                    {spec.valueA}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCatalogueA(!showCatalogueA)}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showCatalogueA ? "Hide" : "See More"} {modelA.brand} Models
            </button>
            {showCatalogueA && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {brandModelsA.map(model => (
                  <Link key={model.id} href={`/models/${model.id}`} className="block">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
                      <h4 className="font-semibold">{model.model}</h4>
                      <p className="text-sm text-slate-600">£{model.price.toLocaleString()}</p>
                      <p className="text-sm text-slate-600">{model.rangeKm} km range</p>
                      <span className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                        View Details
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Model B Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold text-blue-600">{modelB.brand} {modelB.model}</h3>
            <p className="mt-2 text-3xl font-bold">£{modelB.price.toLocaleString()}</p>
            <div className="mt-4 space-y-3">
              {specs.map((spec, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-b-0">
                  <span className="font-medium text-slate-700">{spec.label}</span>
                  <span className={`text-right ${winnerClass(modelA[spec.label.toLowerCase().replace(' ', '') as keyof EVModel] as number, modelB[spec.label.toLowerCase().replace(' ', '') as keyof EVModel] as number, spec.lowerBetter, "right")}`}>
                    {spec.valueB}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowCatalogueB(!showCatalogueB)}
              className="mt-4 w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showCatalogueB ? "Hide" : "See More"} {modelB.brand} Models
            </button>
            {showCatalogueB && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {brandModelsB.map(model => (
                  <Link key={model.id} href={`/models/${model.id}`} className="block">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition-colors">
                      <h4 className="font-semibold">{model.model}</h4>
                      <p className="text-sm text-slate-600">£{model.price.toLocaleString()}</p>
                      <p className="text-sm text-slate-600">{model.rangeKm} km range</p>
                      <span className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                        View Details
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href={`/finance?car=${modelA.id}`}
            className="inline-flex rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 mr-4"
          >
            Finance {modelA.brand} {modelA.model}
          </Link>
          <Link
            href={`/finance?car=${modelB.id}`}
            className="inline-flex rounded-2xl bg-slate-600 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Finance {modelB.brand} {modelB.model}
          </Link>
        </div>
      </div>
    </section>
  );
}