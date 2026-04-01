"use client";

import { useState } from "react";
import type { EVModel } from "@/types";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  preferredContactTime: string;
  budget: string;
  message: string;
  consent: boolean;
}

interface Props {
  modelA: EVModel;
  modelB: EVModel;
}

export default function ComparisonConsultationForm({ modelA, modelB }: Props) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    preferredContactTime: "morning",
    budget: "",
    message: "",
    consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? target.checked : value,
    }));

    if (errors[name]) {
      const { [name]: removed, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email)) newErrors.email = "Invalid email";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.consent) newErrors.consent = "You must agree to be contacted";

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log("Consultation request:", {
        ...formData,
        vehicleA: modelA.id,
        vehicleB: modelB.id,
        comparison: `${modelA.brand} ${modelA.model} vs ${modelB.brand} ${modelB.model}`,
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 to-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-3xl bg-white border border-slate-200 p-8 lg:p-12">
          <h2 className="text-3xl font-bold">Need Help Choosing the Right EV?</h2>
          <p className="mt-3 text-lg text-slate-600">Talk to our consultant for expert guidance.</p>

          <div className="grid gap-4 sm:grid-cols-3 my-8">
            {[
              { icon: "✓", bg: "emerald", text: "Free Support" },
              { icon: "◉", bg: "blue", text: "No Obligation" },
              { icon: "⚡", bg: "purple", text: "24h Response" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-${item.bg}-100 flex items-center justify-center text-${item.bg}-600`}>
                  {item.icon}
                </div>
                <p className="text-sm font-semibold text-slate-700">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                  <span className="text-4xl">✓</span>
                  <h3 className="text-2xl font-bold text-emerald-900 mt-2">Request Sent!</h3>
                  <p className="text-emerald-800 mt-2">Our team will contact you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {[
                    { id: "fullName", label: "Full Name", type: "text", required: true },
                    { id: "email", label: "Email", type: "email", required: true },
                    { id: "phone", label: "Phone", type: "tel", required: true },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-sm font-semibold text-slate-700 mb-2">
                        {field.label} {field.required && "*"}
                      </label>
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        value={formData[field.id as keyof FormData] || ""}
                        onChange={handleChange}
                        className={`w-full rounded-lg border px-4 py-3 focus:outline-none ${
                          errors[field.id] ? "border-red-500 bg-red-50" : "border-slate-300 focus:border-blue-600"
                        }`}
                        required={field.required}
                      />
                      {errors[field.id] && <p className="text-red-600 text-sm mt-1">{errors[field.id]}</p>}
                    </div>
                  ))}

                  <div>
                    <label htmlFor="preferredContactTime" className="block text-sm font-semibold text-slate-700 mb-2">
                      Preferred Time
                    </label>
                    <select
                      id="preferredContactTime"
                      name="preferredContactTime"
                      value={formData.preferredContactTime}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 8 PM)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="budget" className="block text-sm font-semibold text-slate-700 mb-2">
                      Budget
                    </label>
                    <select
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">Select budget</option>
                      <option value="under-20k">Under £20,000</option>
                      <option value="20k-30k">£20,000 - £30,000</option>
                      <option value="30k-40k">£30,000 - £40,000</option>
                      <option value="40k-50k">£40,000 - £50,000</option>
                      <option value="above-50k">Above £50,000</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-blue-600 focus:outline-none"
                      placeholder="Your questions..."
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="consent"
                      name="consent"
                      type="checkbox"
                      checked={formData.consent}
                      onChange={handleChange}
                      className="mt-1 cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-sm text-slate-700">
                      I agree to be contacted about my consultation request.
                    </label>
                  </div>
                  {errors.consent && <p className="text-red-600 text-sm">{errors.consent}</p>}

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    Request Consultation
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 sticky top-6">
                <h3 className="text-lg font-bold mb-4">Your Comparison</h3>
                {[modelA, modelB].map((model, idx) => (
                  <div key={model.id} className={idx === 0 ? "mb-4 pb-4 border-b" : ""}>
                    <p className="text-xs font-semibold text-slate-500">Vehicle {idx === 0 ? "A" : "B"}</p>
                    <h4 className="text-lg font-bold mt-1">{model.brand} {model.model}</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">£{model.price.toLocaleString()}</p>
                    <p className="text-sm text-slate-600">{model.rangeKm} km range</p>
                  </div>
                ))}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-xs font-semibold text-blue-900">Next Steps</p>
                  <p className="text-sm text-blue-800 mt-2">Fill the form and our consultant will help you decide.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}