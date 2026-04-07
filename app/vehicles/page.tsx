import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VehicleDiscovery from "@/components/vehicles/VehicleDiscovery";
import { getAllEVs } from "@/lib/evs";
import {
  buildPersonalizedVehicleCards,
  getVehicleListingContext,
} from "@/lib/vehicles/personalized-listing";
import { evModels } from "@/data/evModels";

export const metadata = {
  title: "Find Your Perfect EV | EV Guide",
  description:
    "Browse all electric vehicles. Filter by price, range, brand and more. Get personalised recommendations.",
};

export default async function VehiclesPage() {
  const dbVehicles = await getAllEVs();
  const vehicles = dbVehicles.length > 0 ? dbVehicles : evModels;
  const listingContext = await getVehicleListingContext(vehicles);
  const personalizedVehicles = buildPersonalizedVehicleCards(vehicles, listingContext);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="py-8 pb-20">
        <VehicleDiscovery
          vehicles={personalizedVehicles}
          segment={listingContext.segment}
        />
      </div>
      <Footer />
    </main>
  );
}

