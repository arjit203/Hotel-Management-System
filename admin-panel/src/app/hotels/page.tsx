"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { adminApi } from "@/lib/api";

interface Hotel {
  _id: string;
  name: string;
  slug: string;
  address: string;
  isActive: boolean;
}

export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    branchId: "",
    name: "",
    slug: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
  });

  async function loadHotelsList() {
    setLoading(true);
    // Public listing endpoint returns active hotels; admin uses same data source for now.
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1"}/hotels`,
      { cache: "no-store" }
    );
    const json = await res.json();
    setHotels(json.success ? json.data : []);
    setLoading(false);
  }

  useEffect(() => {
    loadHotelsList();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await adminApi.post("/admin/hotels", form);
    if (!res.success) {
      setError(res.message || "Failed to create hotel.");
      return;
    }

    setShowForm(false);
    setForm({
      branchId: "",
      name: "",
      slug: "",
      description: "",
      address: "",
      contactPhone: "",
      contactEmail: "",
    });
    loadHotelsList();
  }

  async function handleDelete(hotelId: string) {
    if (!confirm("Deactivate this hotel?")) return;
    const res = await adminApi.delete(`/admin/hotels/${hotelId}`);
    if (res.success) loadHotelsList();
    else alert(res.message);
  }

  return (
    <RequireAdmin>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Hotels</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6 }}
        >
          {showForm ? "Cancel" : "+ New Hotel"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{ border: "1px solid #e5e5e5", padding: 20, borderRadius: 12, margin: "16px 0", maxWidth: 480 }}
        >
          {error && <p style={{ color: "#c00" }}>{error}</p>}
          {[
            { key: "branchId", label: "Branch ID" },
            { key: "name", label: "Hotel Name" },
            { key: "slug", label: "Slug (lowercase-hyphens)" },
            { key: "address", label: "Address" },
            { key: "contactPhone", label: "Contact Phone" },
            { key: "contactEmail", label: "Contact Email" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "block", marginBottom: 10 }}>
              {label}
              <input
                required
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
          ))}
          <label style={{ display: "block", marginBottom: 10 }}>
            Description
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <button type="submit" style={{ background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6 }}>
            Create Hotel
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : hotels.length === 0 ? (
        <p>No hotels yet. Create one above.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e5e5" }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Address</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((hotel) => (
              <tr key={hotel._id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 8 }}>{hotel.name}</td>
                <td style={{ padding: 8 }}>{hotel.address}</td>
                <td style={{ padding: 8 }}>{hotel.isActive ? "Active" : "Inactive"}</td>
                <td style={{ padding: 8 }}>
                  <Link href={`/hotels/${hotel._id}`} style={{ marginRight: 12 }}>
                    Manage
                  </Link>
                  <button
                    onClick={() => handleDelete(hotel._id)}
                    style={{ background: "none", border: "none", color: "#c00", cursor: "pointer" }}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </RequireAdmin>
  );
}
