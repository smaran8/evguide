"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  X, ArrowRight, ArrowLeft, ArrowLeftRight,
  CheckCircle, Upload, Loader2, Car, User, Camera,
  AlertCircle, Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoginPrompt from "@/components/auth/LoginPrompt";
import type {
  ExchangeTargetEV,
  ExchangeFuelType,
  ExchangeCondition,
  ExchangeOwnershipType,
  ValuationConfidence,
} from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExchangeModalProps {
  targetEV: ExchangeTargetEV | null;
  onClose: () => void;
}

interface UploadedImage {
  type: string;
  url: string;
  name: string;
}

interface FormData {
  // Step 1 — Customer
  customer_name: string;
  phone: string;
  email: string;
  city: string;
  preferred_contact_method: string;

  // Step 2 — Current vehicle
  current_vehicle_brand: string;
  current_vehicle_model: string;
  current_vehicle_year: string;
  registration_year: string;
  fuel_type: ExchangeFuelType | "";
  transmission: string;
  ownership_type: ExchangeOwnershipType | "";
  mileage: string;
  registration_number: string;
  condition: ExchangeCondition | "";
  accident_history: boolean;
  service_history: boolean;
  insurance_valid: boolean;
  vehicle_color: string;
  number_of_keys: string;
  vehicle_location: string;
  expected_value: string;
  remarks: string;
}

interface SubmitResult {
  id: string;
  estimated_value: number;
  confidence: ValuationConfidence;
  notes: string[];
  valuation_source?: "ai" | "rules";
}

// ── Field helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] placeholder-[#6B7280] focus:border-[#1FBF9F] focus:outline-none focus:ring-2 focus:ring-[#D1F2EB]";

const selectCls =
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] focus:border-[#1FBF9F] focus:outline-none focus:ring-2 focus:ring-[#D1F2EB]";

function Field({
  label,
  required,
  children,
  span2 = false,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-semibold text-[#6B7280]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: ValuationConfidence }) {
  const map: Record<ValuationConfidence, { label: string; cls: string }> = {
    high:   { label: "High confidence",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    medium: { label: "Medium confidence", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    low:    { label: "Low confidence",    cls: "bg-[#F8FAF9] text-[#6B7280] border-[#E5E7EB]" },
  };
  const { label, cls } = map[confidence];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Star className="h-3 w-3" />
      {label}
    </span>
  );
}

// ── Step indicators ───────────────────────────────────────────────────────────

const STEPS = [
  { icon: User,   label: "Your details" },
  { icon: Car,    label: "Vehicle info" },
  { icon: Camera, label: "Photos & submit" },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-7">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done    = idx < current;
        const active  = idx === current;
        return (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 ${active ? "text-[#1FBF9F]" : done ? "text-[#1FBF9F]" : "text-[#6B7280]"}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-[#1FBF9F] text-white" : done ? "bg-[#1FBF9F] text-white" : "bg-[#E8F8F5] text-[#6B7280]"
              }`}>
                {done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className="hidden text-xs font-semibold sm:inline">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`mx-2 h-px flex-1 ${idx < current ? "bg-[#1FBF9F]/40" : "bg-[#E5E7EB]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Image upload types ────────────────────────────────────────────────────────

const IMAGE_SLOTS = [
  { type: "front",    label: "Front view" },
  { type: "rear",     label: "Rear view" },
  { type: "side",     label: "Side view" },
  { type: "interior", label: "Interior" },
  { type: "odometer", label: "Odometer" },
  { type: "damage",   label: "Damage (if any)" },
];

// ── Main component ────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

export default function ExchangeModal({ targetEV, onClose }: ExchangeModalProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [step, setStep]       = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState<SubmitResult | null>(null);
  const [error, setError]     = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setAuthed(!!user));
  }, []);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [form, setForm] = useState<FormData>({
    customer_name: "",
    phone: "",
    email: "",
    city: "",
    preferred_contact_method: "phone",
    current_vehicle_brand: "",
    current_vehicle_model: "",
    current_vehicle_year: "",
    registration_year: "",
    fuel_type: "",
    transmission: "",
    ownership_type: "",
    mileage: "",
    registration_number: "",
    condition: "",
    accident_history: false,
    service_history: false,
    insurance_valid: false,
    vehicle_color: "",
    number_of_keys: "1",
    vehicle_location: "",
    expected_value: "",
    remarks: "",
  });

  function set(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Validation per step ───────────────────────────────────────────────────

  function validateStep0(): string | null {
    if (!form.customer_name.trim()) return "Full name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.email.trim() || !form.email.includes("@")) return "Valid email is required.";
    return null;
  }

  function validateStep1(): string | null {
    if (!form.current_vehicle_brand.trim()) return "Vehicle brand is required.";
    if (!form.current_vehicle_model.trim()) return "Vehicle model is required.";
    const yr = parseInt(form.current_vehicle_year);
    if (!yr || yr < 1980 || yr > CURRENT_YEAR) return "Valid vehicle year is required.";
    if (!form.fuel_type) return "Fuel type is required.";
    return null;
  }

  function handleNext() {
    setError("");
    const errs = step === 0 ? validateStep0() : validateStep1();
    if (errs) { setError(errs); return; }
    setStep((s) => s + 1);
  }

  // ── Image upload ──────────────────────────────────────────────────────────

  async function handleImageUpload(slotType: string, file: File) {
    setUploadingSlot(slotType);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/exchange-uploads", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Image upload failed.");
        return;
      }
      setUploadedImages((prev) => {
        // Replace existing image of same type, or add
        const filtered = prev.filter((img) => img.type !== slotType);
        return [...filtered, { type: slotType, url: json.url, name: file.name }];
      });
    } catch {
      setError("Image upload failed. Please try again.");
    } finally {
      setUploadingSlot(null);
    }
  }

  // ── Final submit ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        customer_name:            form.customer_name.trim(),
        phone:                    form.phone.trim(),
        email:                    form.email.trim(),
        city:                     form.city.trim() || undefined,
        preferred_contact_method: form.preferred_contact_method,

        current_vehicle_brand:    form.current_vehicle_brand.trim(),
        current_vehicle_model:    form.current_vehicle_model.trim(),
        current_vehicle_year:     parseInt(form.current_vehicle_year),
        registration_year:        form.registration_year ? parseInt(form.registration_year) : undefined,
        fuel_type:                form.fuel_type as ExchangeFuelType,
        transmission:             form.transmission || undefined,
        ownership_type:           (form.ownership_type as ExchangeOwnershipType) || undefined,
        mileage:                  form.mileage ? parseInt(form.mileage) : undefined,
        registration_number:      form.registration_number.trim() || undefined,
        condition:                (form.condition as ExchangeCondition) || undefined,
        accident_history:         form.accident_history,
        service_history:          form.service_history,
        insurance_valid:          form.insurance_valid,
        vehicle_color:            form.vehicle_color.trim() || undefined,
        number_of_keys:           form.number_of_keys ? parseInt(form.number_of_keys) : 1,
        vehicle_location:         form.vehicle_location.trim() || undefined,
        expected_value:           form.expected_value ? parseFloat(form.expected_value) : undefined,
        remarks:                  form.remarks.trim() || undefined,

        target_ev_id:    targetEV?.id,
        target_ev_slug:  targetEV?.slug ?? targetEV?.id,
        target_ev_brand: targetEV?.brand,
        target_ev_model: targetEV?.model,
        target_ev_price: targetEV?.price,
        target_ev_image: targetEV?.heroImage ?? undefined,

        source_page:     typeof window !== "undefined" ? window.location.pathname : undefined,

        uploaded_images: uploadedImages.map((img) => ({
          image_type: img.type,
          file_url:   img.url,
        })),
      };

      const res = await fetch("/api/exchange-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Submission failed. Please try again.");
        return;
      }

      setResult(json);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const imageForSlot = (type: string) => uploadedImages.find((img) => img.type === type);

  // ── Success screen ────────────────────────────────────────────────────────

  if (authed === null) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#6B7280]" />
        </div>
      </ModalShell>
    );
  }

  if (!authed) {
    return (
      <ModalShell onClose={onClose}>
        <div className="px-2 py-4">
          <LoginPrompt action="list your car for exchange" returnTo="/exchange" />
        </div>
      </ModalShell>
    );
  }

  if (result) {
    return (
      <ModalShell onClose={onClose}>
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">Exchange request submitted!</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Our consultant will contact you shortly to discuss your exchange offer.
            </p>
          </div>

          {/* Valuation card */}
          <div className="rounded-2xl border-2 border-[#D1F2EB] bg-[#E8F8F5] p-5 text-left">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1FBF9F]">
                Instant estimated value
              </p>
              {result.valuation_source === "ai" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                  ✦ AI-powered
                </span>
              )}
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-4xl font-black text-[#1FBF9F]">
                £{result.estimated_value.toLocaleString()}
              </p>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            <p className="mt-2 text-xs text-[#6B7280]">
              This is a system estimate only. Your consultant will review and provide a final offer after inspection.
            </p>
          </div>

          {/* Selected EV */}
          {targetEV && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Your selected EV
              </p>
              <div className="flex items-center gap-3">
                {targetEV.heroImage && (
                  <div className="relative h-14 w-20 overflow-hidden rounded-xl bg-[#F8FAF9]">
                    <Image src={targetEV.heroImage} alt={targetEV.model} fill className="object-cover" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-[#1A1A1A]">
                    {targetEV.brand} {targetEV.model}
                  </p>
                  <p className="text-sm text-[#6B7280]">Listed at £{targetEV.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAF9] p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Next steps
            </p>
            <ol className="space-y-1.5 text-sm text-[#6B7280]">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-xs font-bold text-[#1FBF9F]">1</span>
                Our consultant will review your request and call you within 24 hours.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-xs font-bold text-[#1FBF9F]">2</span>
                A physical inspection of your vehicle will be arranged.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#E8F8F5] text-xs font-bold text-[#1FBF9F]">3</span>
                We will present a final exchange offer and process the deal.
              </li>
            </ol>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#1FBF9F] py-3 text-sm font-bold text-white shadow-md hover:bg-[#17A589]"
          >
            Close
          </button>
        </div>
      </ModalShell>
    );
  }

  // ── Form steps ────────────────────────────────────────────────────────────

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ArrowLeftRight className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Exchange Offer</h2>
          <p className="text-xs text-[#6B7280]">
            {targetEV
              ? <>Exchange your current vehicle for{" "}
                  <span className="font-semibold text-[#1A1A1A]">
                    {targetEV.brand} {targetEV.model}
                  </span></>
              : "Get an instant valuation for your current vehicle"}
          </p>
        </div>
      </div>

      <StepBar current={step} />

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Step 0: Customer details ───────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <SectionTitle>Your contact details</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" required>
              <input
                className={inputCls}
                value={form.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
                placeholder="John Smith"
              />
            </Field>
            <Field label="Phone number" required>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+44 7700 900000"
              />
            </Field>
            <Field label="Email address" required>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="City / location">
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="London"
              />
            </Field>
            <Field label="Preferred contact method">
              <select
                className={selectCls}
                value={form.preferred_contact_method}
                onChange={(e) => set("preferred_contact_method", e.target.value)}
              >
                <option value="phone">Phone call</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
          </div>

          {/* Selected EV preview */}
          {targetEV && <TargetEVCard targetEV={targetEV} />}

          <NavButtons step={step} onBack={() => setStep((s) => s - 1)} onNext={handleNext} />
        </div>
      )}

      {/* ── Step 1: Vehicle details ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <SectionTitle>Your current vehicle</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Vehicle brand" required>
              <input
                className={inputCls}
                value={form.current_vehicle_brand}
                onChange={(e) => set("current_vehicle_brand", e.target.value)}
                placeholder="e.g. Toyota"
              />
            </Field>
            <Field label="Vehicle model" required>
              <input
                className={inputCls}
                value={form.current_vehicle_model}
                onChange={(e) => set("current_vehicle_model", e.target.value)}
                placeholder="e.g. Prius"
              />
            </Field>
            <Field label="Year of manufacture" required>
              <input
                type="number"
                className={inputCls}
                value={form.current_vehicle_year}
                onChange={(e) => set("current_vehicle_year", e.target.value)}
                placeholder="e.g. 2019"
                min={1980}
                max={CURRENT_YEAR}
              />
            </Field>
            <Field label="Registration year">
              <input
                type="number"
                className={inputCls}
                value={form.registration_year}
                onChange={(e) => set("registration_year", e.target.value)}
                placeholder="e.g. 2020"
                min={1980}
                max={CURRENT_YEAR}
              />
            </Field>
            <Field label="Fuel type" required>
              <select
                className={selectCls}
                value={form.fuel_type}
                onChange={(e) => set("fuel_type", e.target.value)}
              >
                <option value="">Select fuel type</option>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="ev">Electric (EV)</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Transmission">
              <select
                className={selectCls}
                value={form.transmission}
                onChange={(e) => set("transmission", e.target.value)}
              >
                <option value="">Select</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Ownership">
              <select
                className={selectCls}
                value={form.ownership_type}
                onChange={(e) => set("ownership_type", e.target.value)}
              >
                <option value="">Select</option>
                <option value="first_owner">1st owner</option>
                <option value="second_owner">2nd owner</option>
                <option value="third_owner_plus">3rd owner+</option>
              </select>
            </Field>
            <Field label="Mileage (km)">
              <input
                type="number"
                className={inputCls}
                value={form.mileage}
                onChange={(e) => set("mileage", e.target.value)}
                placeholder="e.g. 45000"
                min={0}
              />
            </Field>
            <Field label="Registration number">
              <input
                className={inputCls}
                value={form.registration_number}
                onChange={(e) => set("registration_number", e.target.value)}
                placeholder="e.g. AB12 CDE"
              />
            </Field>
            <Field label="Vehicle colour">
              <input
                className={inputCls}
                value={form.vehicle_color}
                onChange={(e) => set("vehicle_color", e.target.value)}
                placeholder="e.g. Midnight Blue"
              />
            </Field>
            <Field label="Condition">
              <select
                className={selectCls}
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="poor">Poor</option>
              </select>
            </Field>
            <Field label="Number of keys">
              <input
                type="number"
                className={inputCls}
                value={form.number_of_keys}
                onChange={(e) => set("number_of_keys", e.target.value)}
                min={1}
                max={4}
              />
            </Field>
            <Field label="Vehicle location">
              <input
                className={inputCls}
                value={form.vehicle_location}
                onChange={(e) => set("vehicle_location", e.target.value)}
                placeholder="City where car is located"
              />
            </Field>
            <Field label="Your expected exchange value (£, optional)">
              <input
                type="number"
                className={inputCls}
                value={form.expected_value}
                onChange={(e) => set("expected_value", e.target.value)}
                placeholder="e.g. 12000"
                min={0}
              />
            </Field>
          </div>

          {/* Boolean flags */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAF9] p-4 sm:grid-cols-3">
            <CheckField
              label="Accident history"
              checked={form.accident_history}
              onChange={(v) => set("accident_history", v)}
              danger
            />
            <CheckField
              label="Service history available"
              checked={form.service_history}
              onChange={(v) => set("service_history", v)}
            />
            <CheckField
              label="Insurance currently valid"
              checked={form.insurance_valid}
              onChange={(v) => set("insurance_valid", v)}
            />
          </div>

          <Field label="Notes / remarks" span2>
            <textarea
              className={inputCls}
              rows={3}
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Any additional info about your vehicle..."
            />
          </Field>

          <NavButtons step={step} onBack={() => setStep((s) => s - 1)} onNext={handleNext} />
        </div>
      )}

      {/* ── Step 2: Photos + Review ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <SectionTitle>Vehicle photos (optional but recommended)</SectionTitle>
          <p className="text-xs text-[#6B7280]">
            Upload photos to help us provide a more accurate valuation. PNG, JPG or WEBP, max 5 MB each.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {IMAGE_SLOTS.map((slot) => {
              const uploaded = imageForSlot(slot.type);
              const isUploading = uploadingSlot === slot.type;
              return (
                <div key={slot.type} className="relative">
                  <input
                    ref={(el) => { fileInputRefs.current[slot.type] = el; }}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(slot.type, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[slot.type]?.click()}
                    disabled={isUploading}
                    className={`group relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed py-5 text-xs font-medium transition ${
                      uploaded
                        ? "border-[#1FBF9F] bg-[#E8F8F5] text-[#1FBF9F]"
                        : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#1FBF9F]/50 hover:bg-[#E8F8F5]"
                    }`}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#1FBF9F]" />
                    ) : uploaded ? (
                      <>
                        <div className="relative h-12 w-full overflow-hidden">
                          <Image src={uploaded.url} alt={slot.label} fill className="object-cover" unoptimized />
                        </div>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      </>
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <span>{slot.label}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAF9] p-4 text-sm text-[#6B7280] space-y-2">
            <p className="font-semibold text-[#1A1A1A]">Review your submission</p>
            <p><span className="text-[#6B7280]">Customer:</span> {form.customer_name} · {form.phone}</p>
            <p><span className="text-[#6B7280]">Vehicle:</span> {form.current_vehicle_year} {form.current_vehicle_brand} {form.current_vehicle_model} ({form.fuel_type})</p>
            {form.mileage && <p><span className="text-[#6B7280]">Mileage:</span> {parseInt(form.mileage).toLocaleString()} km</p>}
            {form.condition && <p><span className="text-[#6B7280]">Condition:</span> {form.condition}</p>}
            {targetEV && <p><span className="text-[#6B7280]">Target EV:</span> {targetEV.brand} {targetEV.model} · £{targetEV.price.toLocaleString()}</p>}
            {uploadedImages.length > 0 && (
              <p><span className="text-[#6B7280]">Photos uploaded:</span> {uploadedImages.length}</p>
            )}
          </div>

          <p className="text-xs text-[#6B7280]">
            By submitting you agree that we may contact you regarding this exchange request. This is a non-binding enquiry.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F8FAF9]"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1FBF9F] py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#17A589] disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><ArrowLeftRight className="h-4 w-4" /> Submit Exchange Request</>
              )}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ModalShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#E8F8F5] hover:text-[#1A1A1A]"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-wider text-[#1FBF9F]">{children}</p>
  );
}

function NavButtons({
  step,
  onBack,
  onNext,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F8FAF9]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 rounded-xl bg-[#1FBF9F] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#17A589]"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#1A1A1A]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded border-[#E5E7EB] ${danger ? "accent-red-500" : "accent-[#1FBF9F]"}`}
      />
      <span className={checked && danger ? "font-semibold text-red-600" : ""}>{label}</span>
    </label>
  );
}

function TargetEVCard({ targetEV }: { targetEV: ExchangeTargetEV }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      {targetEV.heroImage && (
        <div className="relative h-14 w-20 overflow-hidden rounded-xl bg-[#F8FAF9] flex-shrink-0">
          <Image src={targetEV.heroImage} alt={targetEV.model} fill className="object-cover" unoptimized />
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
          You are exchanging for
        </p>
        <p className="font-bold text-[#1A1A1A]">
          {targetEV.brand} {targetEV.model}
        </p>
        <p className="text-sm text-[#6B7280]">Listed at £{targetEV.price.toLocaleString()}</p>
      </div>
    </div>
  );
}
