import { EVModel } from "@/types";
import { evModels } from "@/data/evModels";

function winnerClass(values: number[], index: number, lowerBetter = false) {
  const value = values[index];
  const others = values.filter((_, i) => i !== index);
  const isBest = lowerBetter 
    ? others.every(other => value <= other)
    : others.every(other => value >= other);
  return isBest ? "font-semibold text-emerald-600" : "text-slate-900";
}

export default function AllModelsComparison() {
  const specs = [
    { label: "Price", key: "price", lowerBetter: true, format: (v: number) => `£${v.toLocaleString()}` },
    { label: "Range", key: "rangeKm", lowerBetter: false, format: (v: number) => `${v} km` },
    { label: "Battery", key: "batteryKWh", lowerBetter: false, format: (v: number) => `${v} kWh` },
    { label: "Torque", key: "torqueNm", lowerBetter: false, format: (v: number) => `${v} Nm` },
    { label: "Ground Clearance", key: "groundClearanceMm", lowerBetter: false, format: (v: number) => `${v} mm` },
  ];

  const brands = [...new Set(evModels.map(m => m.brand))];

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-3xl font-bold">Compare All EV Brands & Models</h2>
        <p className="mt-2 text-slate-600">Side-by-side comparison of all available electric vehicles</p>

        {brands.map(brand => {
          const brandModels = evModels.filter(m => m.brand === brand);
          return (
            <div key={brand} className="mt-12">
              <h3 className="text-2xl font-bold text-blue-600">{brand}</h3>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 bg-white rounded-lg">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 p-4 text-left font-semibold">Model</th>
                      {specs.map(spec => (
                        <th key={spec.key} className="border border-slate-200 p-4 text-center font-semibold">{spec.label}</th>
                      ))}
                      <th className="border border-slate-200 p-4 text-center font-semibold">ADAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandModels.map(model => (
                      <tr key={model.id} className="hover:bg-slate-50">
                        <td className="border border-slate-200 p-4 font-medium">{model.model}</td>
                        {specs.map(spec => {
                          const values = brandModels.map(m => (m as any)[spec.key]);
                          const index = brandModels.indexOf(model);
                          return (
                            <td key={spec.key} className={`border border-slate-200 p-4 text-center ${winnerClass(values, index, spec.lowerBetter)}`}>
                              {spec.format((model as any)[spec.key])}
                            </td>
                          );
                        })}
                        <td className="border border-slate-200 p-4 text-center">{model.adas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}