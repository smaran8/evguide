"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  brand: "",
  model: "",
  hero_image: "",
  tier: "",
  body_type: "",
  badge: "",
  price: "",
  motor_capacity_kw: "",
  torque_nm: "",
  ground_clearance_mm: "",
  tyre_size: "",
  battery_kwh: "",
  range_km: "",
  drive: "",
  charging_standard: "",
  fast_charge_time: "",
  adas: "",
  warranty: "",
  seats: "",
  boot_litres: "",
  top_speed_kph: "",
  acceleration: "",
  description: "",
  best_for: "",
  loved_reason: "",
};

type FormShape = typeof EMPTY_FORM;

interface Props {
  mode?: "create" | "edit";
  id?: string;
  initialData?: Partial<FormShape>;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  step,
  span2 = false,
  textarea = false,
  rows = 3,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  span2?: boolean;
  textarea?: boolean;
  rows?: number;
}) {
  const cls = `w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none`;
  return (
    <div className={span2 ? "md:col-span-2" : ""}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {textarea ? (
        <textarea name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder} className={cls} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} step={step} className={cls} />
      )}
    </div>
  );
}

export default function AdminEVForm({ mode = "create", id, initialData }: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormShape>({
    ...EMPTY_FORM,
    ...Object.fromEntries(
      Object.entries(initialData ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)])
    ),
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/uploads", { method: "POST", body: uploadData });
      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error ?? "Failed to upload image.");
        setMessageType("error");
        return;
      }

      setFormData((prev) => ({ ...prev, hero_image: result.url }));
      setMessage("Image uploaded.");
      setMessageType("success");
    } catch {
      setMessage("Something went wrong uploading the image.");
      setMessageType("error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      brand: formData.brand,
      model: formData.model,
      hero_image: formData.hero_image,
      tier: formData.tier || null,
      body_type: formData.body_type || null,
      badge: formData.badge || null,
      price: Number(formData.price),
      motor_capacity_kw: Number(formData.motor_capacity_kw),
      torque_nm: Number(formData.torque_nm),
      ground_clearance_mm: Number(formData.ground_clearance_mm),
      tyre_size: formData.tyre_size,
      battery_kwh: Number(formData.battery_kwh),
      range_km: Number(formData.range_km),
      drive: formData.drive,
      charging_standard: formData.charging_standard,
      fast_charge_time: formData.fast_charge_time,
      adas: formData.adas,
      warranty: formData.warranty,
      seats: Number(formData.seats),
      boot_litres: Number(formData.boot_litres),
      top_speed_kph: Number(formData.top_speed_kph),
      acceleration: formData.acceleration,
      description: formData.description,
      best_for: formData.best_for,
      loved_reason: formData.loved_reason,
    };

    try {
      const res = await fetch(mode === "edit" ? `/api/evs/${id}` : "/api/evs", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error ?? "Failed to save EV.");
        setMessageType("error");
        return;
      }

      setMessage(mode === "edit" ? "EV updated successfully." : "EV added successfully.");
      setMessageType("success");

      if (mode === "create") {
        setFormData(EMPTY_FORM);
      } else {
        router.refresh();
      }
    } catch {
      setMessage("Something went wrong.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">

      {/* Basic Info */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-slate-900">Basic Info</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Brand" name="brand" value={formData.brand} onChange={handleChange} placeholder="Tesla" />
          <Field label="Model" name="model" value={formData.model} onChange={handleChange} placeholder="Model 3" />

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Hero Image URL</label>
            <input
              type="text"
              name="hero_image"
              value={formData.hero_image}
              onChange={handleChange}
              placeholder="https://example.com/car.jpg"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-500">
                {uploadingImage ? "Uploading..." : "Or upload PNG / JPG / WEBP (max 5 MB)"}
              </p>
            </div>
          </div>

          <Field label="Price (£)" name="price" value={formData.price} onChange={handleChange} type="number" placeholder="39000" />
          <Field label="Best For" name="best_for" value={formData.best_for} onChange={handleChange} placeholder="Tech lovers" />

          {/* Discovery classification */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Tier</label>
            <select
              name="tier"
              value={formData.tier}
              onChange={(e) => setFormData((prev) => ({ ...prev, tier: e.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Auto (from price)</option>
              <option value="affordable">Affordable (≤ £32k)</option>
              <option value="mid">Mid-Range (£32k – £46k)</option>
              <option value="premium">Premium (£46k+)</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Body Type</label>
            <select
              name="body_type"
              value={formData.body_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, body_type: e.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Not specified</option>
              <option value="suv">SUV</option>
              <option value="hatchback">Hatchback</option>
              <option value="sedan">Sedan</option>
              <option value="crossover">Crossover</option>
              <option value="coupe">Coupé</option>
              <option value="estate">Estate</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Badge Tag (optional)</label>
            <select
              name="badge"
              value={formData.badge}
              onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Auto-assign</option>
              <option value="Best Value">Best Value</option>
              <option value="Long Range">Long Range</option>
              <option value="Family Pick">Family Pick</option>
              <option value="City Friendly">City Friendly</option>
              <option value="Premium Choice">Premium Choice</option>
            </select>
          </div>
          <Field label="Description" name="description" value={formData.description} onChange={handleChange} textarea rows={3} span2 placeholder="Describe this EV..." />
          <Field label="Why People Love It" name="loved_reason" value={formData.loved_reason} onChange={handleChange} textarea rows={2} span2 placeholder="What makes it special..." />
        </div>
      </section>

      {/* Performance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-slate-900">Performance</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Motor Power (kW)" name="motor_capacity_kw" value={formData.motor_capacity_kw} onChange={handleChange} type="number" placeholder="208" />
          <Field label="Torque (Nm)" name="torque_nm" value={formData.torque_nm} onChange={handleChange} type="number" placeholder="420" />
          <Field label="Top Speed (km/h)" name="top_speed_kph" value={formData.top_speed_kph} onChange={handleChange} type="number" placeholder="225" />
          <Field label="0–100 km/h Acceleration" name="acceleration" value={formData.acceleration} onChange={handleChange} placeholder="6.1s" />
          <Field label="Drive Type" name="drive" value={formData.drive} onChange={handleChange} placeholder="RWD / FWD / AWD" />
        </div>
      </section>

      {/* Battery & Charging */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-slate-900">Battery &amp; Charging</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Battery Capacity (kWh)" name="battery_kwh" value={formData.battery_kwh} onChange={handleChange} type="number" step="0.1" placeholder="57.5" />
          <Field label="Range (km)" name="range_km" value={formData.range_km} onChange={handleChange} type="number" placeholder="491" />
          <Field label="Charging Standard" name="charging_standard" value={formData.charging_standard} onChange={handleChange} placeholder="CCS" />
          <Field label="Fast Charge Time" name="fast_charge_time" value={formData.fast_charge_time} onChange={handleChange} placeholder="25 min (10–80%)" />
        </div>
      </section>

      {/* Dimensions & Features */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-slate-900">Dimensions &amp; Features</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Seats" name="seats" value={formData.seats} onChange={handleChange} type="number" placeholder="5" />
          <Field label="Boot Space (litres)" name="boot_litres" value={formData.boot_litres} onChange={handleChange} type="number" placeholder="594" />
          <Field label="Ground Clearance (mm)" name="ground_clearance_mm" value={formData.ground_clearance_mm} onChange={handleChange} type="number" placeholder="140" />
          <Field label="Tyre Size" name="tyre_size" value={formData.tyre_size} onChange={handleChange} placeholder="235/45 R18" />
          <Field label="ADAS Features" name="adas" value={formData.adas} onChange={handleChange} span2 placeholder="Autopilot, Lane Assist, AEB..." />
          <Field label="Warranty" name="warranty" value={formData.warranty} onChange={handleChange} span2 placeholder="4 years / 80,000 km" />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : mode === "edit" ? "Save Changes" : "Add EV"}
        </button>

        {mode === "edit" && (
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}

        {message && (
          <p className={`text-sm font-medium ${messageType === "error" ? "text-red-600" : "text-emerald-600"}`}>
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
