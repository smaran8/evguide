import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { evModels } from "@/data/evModels";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return evModels.map((model) => ({
    id: model.id,
  }));
}

export default async function CarDetailsPage({ params }: Props) {
  const { id } = await params;
  const model = evModels.find(m => m.id === id);

  if (!model) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <div className="mx-auto max-w-7xl px-6 py-14 text-center">
          <h1 className="text-4xl font-bold">Vehicle not found</h1>
          <p className="mt-4 text-slate-600">The EV model you're looking for doesn't exist.</p>
          <Link href="/compare" className="mt-6 inline-block text-blue-600 hover:underline">
            Back to Compare
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Image Placeholder */}
            <div className="aspect-video rounded-3xl bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center">
              <span className="text-slate-500 text-lg">{model.brand} {model.model}</span>
            </div>
            
            {/* Details */}
            <div>
              <p className="text-sm font-semibold text-blue-600">{model.brand}</p>
              <h1 className="mt-2 text-5xl font-bold">{model.model}</h1>
              <p className="mt-4 text-4xl font-bold text-slate-900">£{model.price.toLocaleString()}</p>
              
              <p className="mt-6 text-lg text-slate-600">{model.description}</p>
              
              <div className="mt-8 flex gap-4">
                <Link
                  href={`/compare?carA=${model.id}`}
                  className="flex-1 rounded-2xl bg-blue-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Compare This EV
                </Link>
                <Link
                  href={`/finance?car=${model.id}`}
                  className="flex-1 rounded-2xl bg-emerald-600 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Finance This EV
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Grid */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold mb-8">Key Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Range</p>
              <p className="mt-2 text-2xl font-bold">{model.rangeKm} km</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Battery</p>
              <p className="mt-2 text-2xl font-bold">{model.batteryKWh} kWh</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Top Speed</p>
              <p className="mt-2 text-2xl font-bold">{model.topSpeedKph} km/h</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Acceleration</p>
              <p className="mt-2 text-2xl font-bold">{model.acceleration}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Motor Power</p>
              <p className="mt-2 text-2xl font-bold">{model.motorCapacityKw} kW</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Torque</p>
              <p className="mt-2 text-2xl font-bold">{model.torqueNm} Nm</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Seating</p>
              <p className="mt-2 text-2xl font-bold">{model.seats} Seats</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Boot Space</p>
              <p className="mt-2 text-2xl font-bold">{model.bootLitres} L</p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Specifications */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-bold mb-8">Detailed Specifications</h2>
          
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Performance */}
            <div>
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-slate-200">Performance</h3>
              <dl className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Motor Power</dt>
                  <dd className="font-semibold">{model.motorCapacityKw} kW</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Torque</dt>
                  <dd className="font-semibold">{model.torqueNm} Nm</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Acceleration (0-100 km/h)</dt>
                  <dd className="font-semibold">{model.acceleration}</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Top Speed</dt>
                  <dd className="font-semibold">{model.topSpeedKph} km/h</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Drive Type</dt>
                  <dd className="font-semibold">{model.drive}</dd>
                </div>
              </dl>
            </div>

            {/* Battery & Charging */}
            <div>
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-slate-200">Battery & Charging</h3>
              <dl className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Battery Capacity</dt>
                  <dd className="font-semibold">{model.batteryKWh} kWh</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Range</dt>
                  <dd className="font-semibold">{model.rangeKm} km</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Charging Standard</dt>
                  <dd className="font-semibold">{model.chargingStandard}</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Fast Charging Time</dt>
                  <dd className="font-semibold">{model.fastChargeTime}</dd>
                </div>
              </dl>
            </div>

            {/* Dimensions */}
            <div>
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-slate-200">Dimensions & Capacity</h3>
              <dl className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Seating</dt>
                  <dd className="font-semibold">{model.seats} Seats</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Boot Space</dt>
                  <dd className="font-semibold">{model.bootLitres} L</dd>
                </div>
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">Ground Clearance</dt>
                  <dd className="font-semibold">{model.groundClearanceMm} mm</dd>
                </div>
              </dl>
            </div>

            {/* Features & Safety */}
            <div>
              <h3 className="text-xl font-bold mb-6 pb-4 border-b border-slate-200">Features & Safety</h3>
              <dl className="space-y-4">
                <div className="flex justify-between py-3 border-b border-slate-100 last:border-b-0">
                  <dt className="font-medium">ADAS Features</dt>
                  <dd className="font-semibold">{model.adas}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Ready to make a decision?</h2>
            <p className="mt-4 text-slate-600">Explore financing options or compare with other models</p>
            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href={`/finance?car=${model.id}`}
                className="rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Explore Financing
              </Link>
              <Link
                href="/compare"
                className="rounded-2xl bg-white border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Compare Models
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}