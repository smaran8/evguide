"use client";

import { useState } from "react";

export default function AdminEVForm() {
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    hero_image: "",
    price: "",
    battery_kwh: "",
    range_km: "",
    description: "",
    best_for: "",
    loved_reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingImage(true);
    setMessage("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: uploadData,
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to upload image.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        hero_image: result.url,
      }));
      setMessage("Image uploaded successfully.");
    } catch {
      setMessage("Something went wrong while uploading image.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/evs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand: formData.brand,
          model: formData.model,
          hero_image: formData.hero_image,
          price: Number(formData.price),
          battery_kwh: Number(formData.battery_kwh),
          range_km: Number(formData.range_km),
          description: formData.description,
          best_for: formData.best_for,
          loved_reason: formData.loved_reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to save EV.");
        return;
      }

      setMessage("EV added successfully.");

      setFormData({
        brand: "",
        model: "",
        hero_image: "",
        price: "",
        battery_kwh: "",
        range_km: "",
        description: "",
        best_for: "",
        loved_reason: "",
      });
    } catch (error) {
      setMessage("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Brand
          </label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Tesla"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Model
          </label>
          <input
            type="text"
            name="model"
            value={formData.model}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Model 3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Hero Image URL
          </label>
          <input
            type="text"
            name="hero_image"
            value={formData.hero_image}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="https://example.com/car.jpg"
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
              {uploadingImage
                ? "Uploading image..."
                : "Or upload a local image (PNG, JPG, WEBP, max 5MB)."}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Price
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="39000"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Battery (kWh)
          </label>
          <input
            type="number"
            step="0.1"
            name="battery_kwh"
            value={formData.battery_kwh}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="57.5"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Range (km)
          </label>
          <input
            type="number"
            name="range_km"
            value={formData.range_km}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="491"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Best For
          </label>
          <input
            type="text"
            name="best_for"
            value={formData.best_for}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Tech-focused buyers"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Describe the EV..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Why People Love It
          </label>
          <textarea
            name="loved_reason"
            value={formData.loved_reason}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3"
            placeholder="Explain why customers love this EV..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save EV"}
        </button>

        {message ? (
          <p className="text-sm font-medium text-slate-600">{message}</p>
        ) : null}
      </div>
    </form>
  );
}