"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { evModels } from "@/data/evModels";

function AppointmentFormContent() {
  const searchParams = useSearchParams();
  const carId = searchParams.get("carId");
  const model = evModels.find(m => m.id === carId);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would send the form data to your backend
    console.log("Form submitted:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        preferredDate: "",
        preferredTime: "",
        message: "",
      });
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">
            ← Back
          </Link>
          <h1 className="text-4xl font-bold">Book Your Free EV Consultation</h1>
          <p className="mt-4 text-lg text-slate-600">
            Our expert consultants are ready to help you find the perfect electric vehicle
          </p>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-8">
                <h2 className="text-2xl font-bold mb-6">Your Details</h2>

                {submitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                    <h3 className="text-xl font-bold text-emerald-900">Thank you!</h3>
                    <p className="mt-2 text-emerald-800">We've received your appointment request. Our team will contact you shortly to confirm your preferred date and time.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                        placeholder="john@example.com"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                        placeholder="+44 (0) 123 456 7890"
                      />
                    </div>

                    {/* Preferred Date */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        name="preferredDate"
                        value={formData.preferredDate}
                        onChange={handleChange}
                        required
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* Preferred Time */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Preferred Time *
                      </label>
                      <select
                        name="preferredTime"
                        value={formData.preferredTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                        required
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                      >
                        <option value="">Select a time slot</option>
                        <option value="09:00">09:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Additional Questions or Comments
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:outline-none focus:border-blue-600"
                        placeholder="Tell us more about your interest in EVs..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-lg font-bold text-white hover:bg-blue-700 transition-colors"
                    >
                      Book Your Appointment
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Vehicle Info Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sticky top-6">
                <h3 className="text-lg font-bold mb-4">Interested Vehicle</h3>
                {model ? (
                  <div>
                    <div className="aspect-video rounded-2xl bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center mb-4">
                      <span className="text-slate-500 text-sm">{model.brand} {model.model}</span>
                    </div>
                    <h4 className="font-bold text-lg">{model.brand}</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">£{model.price.toLocaleString()}</p>
                    <p className="text-sm text-slate-600 mt-2">{model.rangeKm} km range</p>
                    <Link
                      href={`/cars/${model.id}`}
                      className="mt-4 block text-center rounded-2xl border border-blue-600 text-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-50"
                    >
                      View Full Details
                    </Link>
                  </div>
                ) : (
                  <p className="text-slate-600">
                    <Link href="/compare" className="text-blue-600 hover:underline">
                      Select a vehicle
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AppointmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentFormContent />
    </Suspense>
  );
}