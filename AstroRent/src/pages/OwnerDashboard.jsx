import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bath,
  Bed,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Home,
  ImagePlus,
  LogOut,
  MapPin,
  Receipt,
  Send,
  Trash2,
  Users
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";

const API_URL = "http://127.0.0.1:5000";

const emptyHouseForm = {
  apartment_id: "",
  title: "",
  location: "",
  price: "",
  image: "",
  images: [],
  beds: "",
  baths: "",
  status: "pending",
  apartment_name: "",
  total_floors: "",
  total_houses: "",
  floor_number: "",
  unit_number: "",
  house_category: "single room",
  latitude: "",
  longitude: "",
  occupied_until: "",
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_payment_status: "",
  customer_move_in_date: "",
  vacate_request: "",
  condition_report: "",
  monthly_income: ""
};

const emptyIncomeForm = {
  house_id: "",
  customer_name: "",
  customer_phone: "",
  amount: "",
  paid_for: "",
  paid_on: "",
  notes: ""
};

const UNIT_CATEGORIES = [
  "airbnb",
  "single room",
  "studio room",
  "bedsitter",
  "1 bedroom",
  "2 bedroom",
  "3 bedroom",
  "commercial"
];

const emptyApartmentForm = {
  name: "",
  location: "",
  total_floors: "",
  notes: "",
  unit_mix: [
    { category: "2 bedroom", count: "10" },
    { category: "studio room", count: "15" }
  ]
};

function OwnerDashboard() {
  const navigate = useNavigate();
  const ownerName = localStorage.getItem("owner_name") || "Home owner";
  const token = localStorage.getItem("owner_token");
  const [houses, setHouses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [income, setIncome] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [houseForm, setHouseForm] = useState(emptyHouseForm);
  const [apartmentForm, setApartmentForm] = useState(emptyApartmentForm);
  const [incomeForm, setIncomeForm] = useState(emptyIncomeForm);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "" });
  const [editingApartmentId, setEditingApartmentId] = useState(null);
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [activeTab, setActiveTab] = useState("buildings");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [overdueDrafts, setOverdueDrafts] = useState({});

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }), [token]);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }, [headers]);

  const loadOwnerData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [apartmentData, houseData, incomeData, bookingData, tenantData, announcementData] = await Promise.all([
        request("/api/owner/apartments"),
        request("/api/owner/houses"),
        request("/api/owner/income"),
        request("/api/owner/bookings"),
        request("/api/owner/tenants"),
        request("/api/owner/announcements")
      ]);

      setApartments(apartmentData);
      setHouses(houseData);
      setIncome(incomeData);
      setBookings(bookingData);
      setTenants(tenantData);
      setAnnouncements(announcementData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    Promise.resolve().then(loadOwnerData);
  }, [loadOwnerData]);

  const stats = useMemo(() => {
    const occupied = houses.filter((house) => house.status === "occupied").length;
    const active = houses.filter((house) => ["active", "verified"].includes(house.status)).length;
    const pending = houses.filter((house) => house.status === "pending").length;
    const newBookings = bookings.filter((booking) => booking.status === "new").length;
    const totalIncome = income.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const overdueTenants = tenants.filter((tenant) => getTenantBalance(tenant) > 0).length;

    return [
      { label: "Buildings", value: apartments.length, icon: Building2 },
      { label: "Units", value: houses.length, icon: Home },
      { label: "Active", value: active, icon: CheckCircle2 },
      { label: "Occupied", value: occupied, icon: Users },
      { label: "Pending", value: pending, icon: ClipboardList },
      { label: "Bookings", value: newBookings, icon: Bell },
      { label: "Overdue", value: overdueTenants, icon: AlertTriangle },
      { label: "Income", value: `Ksh ${totalIncome.toLocaleString()}`, icon: Receipt }
    ];
  }, [apartments, houses, income, bookings, tenants]);

  const hasApprovedListing = useMemo(() => (
    houses.some((house) => ["active", "verified", "occupied"].includes(house.status))
  ), [houses]);

  const waitingForFirstApproval = houses.length > 0 && !hasApprovedListing;

  const ownerNotifications = useMemo(() => {
    const bookingUpdates = bookings.flatMap((booking) => {
      const updates = [];

      if (booking.status === "new") {
        updates.push({
          id: `owner-booking-${booking.id}-new`,
          title: "New booking request",
          body: `${booking.finder_name || "A home finder"} wants to book ${booking.house_title || "one of your homes"}.`,
          time: booking.created_at || `booking-${booking.id}`,
          targetTab: "bookings",
          targetId: `owner-booking-${booking.id}`
        });
      }

      if (booking.visit_requested) {
        updates.push({
          id: `owner-booking-${booking.id}-visit-${booking.visit_requested}`,
          title: "Visit request received",
          body: `${booking.finder_name || "A tenant"} asked to visit ${booking.house_title || "the home"}.`,
          time: booking.created_at || `booking-${booking.id}-visit`,
          targetTab: "bookings",
          targetId: `owner-booking-${booking.id}`
        });
      }

      if (booking.condition_message) {
        updates.push({
          id: `owner-booking-${booking.id}-condition-${booking.condition_message}`,
          title: "Condition message",
          body: `${booking.finder_name || "A tenant"} reported an update for ${booking.house_title || "the unit"}.`,
          time: booking.created_at || `booking-${booking.id}-condition`,
          targetTab: "bookings",
          targetId: `owner-booking-${booking.id}`
        });
      }

      if (booking.vacate_request) {
        updates.push({
          id: `owner-booking-${booking.id}-vacate-${booking.vacate_request}`,
          title: "Vacate request",
          body: `${booking.finder_name || "A tenant"} sent a vacate request for ${booking.house_title || "the unit"}.`,
          time: booking.created_at || `booking-${booking.id}-vacate`,
          targetTab: "bookings",
          targetId: `owner-booking-${booking.id}`
        });
      }

      return updates;
    });

    const listingUpdates = houses
      .filter((house) => ["pending", "verified", "rejected", "suspended"].includes(house.status))
      .map((house) => ({
        id: `owner-house-${house.id}-${house.status}`,
        title: house.status === "pending" ? "Listing awaiting admin review" : `Listing ${house.status}`,
        body: `${house.title || "Your listing"} is currently marked ${house.status}.`,
        time: `house-${house.id}`,
        targetTab: "apartments",
        targetId: `owner-house-${house.id}`
      }));

    const tenantUpdates = tenants
      .filter((tenant) => getTenantBalance(tenant) > 0 || tenant.house?.customer_payment_status === "rent overdue")
      .map((tenant) => ({
        id: `owner-tenant-${tenant.booking.id}-rent-due`,
        title: "Rent balance detected",
        body: `${tenant.booking.finder_name || tenant.house?.customer_name || "A tenant"} has a rent balance on ${tenant.house?.title || tenant.booking.house_title || "a unit"}.`,
        time: `tenant-${tenant.booking.id}`,
        targetTab: "tenants",
        targetId: `owner-tenant-${tenant.booking.id}`
      }));

    return [...bookingUpdates, ...tenantUpdates, ...listingUpdates].slice(0, 12);
  }, [bookings, houses, tenants]);

  const openNotificationTarget = (notification) => {
    setActiveTab(notification.targetTab || "bookings");

    window.setTimeout(() => {
      document.getElementById(notification.targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 80);
  };

  const handleLogout = () => {
    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner_name");
    localStorage.removeItem("owner_account_type");
    navigate("/login/home-owner");
  };

  const showSuccess = (text) => {
    setMessage(text);
    setError("");
  };

  const handleApartmentSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingApartmentId) {
        await request(`/api/owner/apartments/${editingApartmentId}`, {
          method: "PUT",
          body: JSON.stringify(apartmentForm)
        });
        showSuccess("Apartment updated successfully.");
      } else {
        await request("/api/owner/apartments", {
          method: "POST",
          body: JSON.stringify(apartmentForm)
        });
        showSuccess("Apartment saved successfully.");
      }

      setApartmentForm(emptyApartmentForm);
      setEditingApartmentId(null);
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditApartment = (apartment) => {
    setApartmentForm({
      name: apartment.name || "",
      location: apartment.location || "",
      total_floors: apartment.total_floors || "",
      notes: apartment.notes || "",
      unit_mix: apartment.unit_mix?.length ? apartment.unit_mix : emptyApartmentForm.unit_mix
    });
    setEditingApartmentId(apartment.id);
    setActiveTab("buildings");
  };

  const handleHouseSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingHouseId) {
        await request(`/api/owner/houses/${editingHouseId}`, {
          method: "PUT",
          body: JSON.stringify(houseForm)
        });
        showSuccess("Apartment updated successfully.");
      } else {
        await request("/api/owner/houses", {
          method: "POST",
          body: JSON.stringify(houseForm)
        });
        showSuccess("Apartment uploaded successfully.");
      }

      setHouseForm(emptyHouseForm);
      setEditingHouseId(null);
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditHouse = (house) => {
    setHouseForm({
      title: house.title || "",
      apartment_id: house.apartment_id || "",
      location: house.location || "",
      price: house.price || "",
      image: house.image || "",
      images: house.images || [],
      beds: house.beds || "",
      baths: house.baths || "",
      status: house.status || "pending",
      apartment_name: house.apartment_name || "",
      total_floors: house.total_floors || "",
      total_houses: house.total_houses || "",
      floor_number: house.floor_number || "",
      unit_number: house.unit_number || "",
      house_category: house.house_category || "single room",
      latitude: house.latitude || "",
      longitude: house.longitude || "",
      occupied_until: house.occupied_until || "",
      customer_name: house.customer_name || "",
      customer_phone: house.customer_phone || "",
      customer_email: house.customer_email || "",
      customer_payment_status: house.customer_payment_status || "",
      customer_move_in_date: house.customer_move_in_date || "",
      vacate_request: house.vacate_request || "",
      condition_report: house.condition_report || "",
      monthly_income: house.monthly_income || ""
    });
    setEditingHouseId(house.id);
    setActiveTab("apartments");
  };

  const handleDeleteHouse = async (houseId) => {
    if (!window.confirm("Delete this apartment permanently?")) {
      return;
    }

    try {
      await request(`/api/owner/houses/${houseId}`, { method: "DELETE" });
      showSuccess("Apartment deleted.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location pinning.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHouseForm((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude)
        }));
        showSuccess("Location pinned from this device.");
      },
      () => setError("Could not access your location.")
    );
  };

  const handleIncomeSubmit = async (event) => {
    event.preventDefault();

    try {
      await request("/api/owner/income", {
        method: "POST",
        body: JSON.stringify(incomeForm)
      });
      setIncomeForm(emptyIncomeForm);
      showSuccess("Income recorded successfully.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteIncome = async (recordId) => {
    if (!window.confirm("Delete this income record?")) {
      return;
    }

    try {
      await request(`/api/owner/income/${recordId}`, { method: "DELETE" });
      showSuccess("Income record deleted.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await request(`/api/owner/bookings/${bookingId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      showSuccess("Booking notification updated.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkOccupied = async (bookingId) => {
    try {
      await request(`/api/owner/bookings/${bookingId}/move-in`, {
        method: "PATCH",
        body: JSON.stringify({
          customer_payment_status: "active tenant"
        })
      });
      showSuccess("Unit marked as occupied and client details saved.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAnnouncementSubmit = async (event) => {
    event.preventDefault();

    try {
      await request("/api/owner/announcements", {
        method: "POST",
        body: JSON.stringify(announcementForm)
      });
      setAnnouncementForm({ title: "", message: "" });
      showSuccess("Announcement sent to tenants.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendOverdueNotice = async (tenant) => {
    const balance = getTenantBalance(tenant);
    const draft = overdueDrafts[tenant.booking.id] || "";
    const defaultMessage = `Your rent for ${tenant.house?.title || tenant.booking.house_title} is overdue. Balance: Ksh ${balance.toLocaleString()}. Please clear it as soon as possible.`;

    try {
      await request(`/api/owner/bookings/${tenant.booking.id}/rent-overdue`, {
        method: "PATCH",
        body: JSON.stringify({
          balance,
          message: draft.trim() || defaultMessage
        })
      });
      setOverdueDrafts((current) => ({
        ...current,
        [tenant.booking.id]: ""
      }));
      showSuccess("Rent overdue notice sent to tenant.");
      await loadOwnerData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="text-xl font-bold text-blue-600">
              AstroRent
            </Link>
            <p className="text-sm text-slate-500">Owner dashboard for {ownerName}</p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell
              notifications={ownerNotifications}
              storageKey="owner_read_notifications"
              onNotificationClick={openNotificationTarget}
              buttonClassName="border-slate-300"
            />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <Icon size={18} className="text-blue-600" />
                </div>
                <p className="mt-3 text-2xl font-bold">{item.value}</p>
              </div>
            );
          })}
        </section>

        {(message || error) && (
          <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || message}
          </div>
        )}

        <div className="mt-6 flex gap-2 border-b">
          <TabButton active={activeTab === "buildings"} onClick={() => setActiveTab("buildings")} icon={Building2}>
            Buildings
          </TabButton>
          <TabButton active={activeTab === "apartments"} onClick={() => setActiveTab("apartments")} icon={Home}>
            Units
          </TabButton>
          <TabButton active={activeTab === "bookings"} onClick={() => setActiveTab("bookings")} icon={Bell}>
            Bookings
          </TabButton>
          <TabButton active={activeTab === "tenants"} onClick={() => setActiveTab("tenants")} icon={Users}>
            Tenants
          </TabButton>
          <TabButton active={activeTab === "income"} onClick={() => setActiveTab("income")} icon={Receipt}>
            Income
          </TabButton>
        </div>

        {activeTab === "buildings" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <BuildingForm
              form={apartmentForm}
              setForm={setApartmentForm}
              editingApartmentId={editingApartmentId}
              onSubmit={handleApartmentSubmit}
              onCancel={() => {
                setApartmentForm(emptyApartmentForm);
                setEditingApartmentId(null);
              }}
            />

            <BuildingList
              apartments={apartments}
              houses={houses}
              bookings={bookings}
              loading={loading}
              onEdit={handleEditApartment}
            />
          </section>
        )}

        {activeTab === "apartments" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <ApartmentForm
              form={houseForm}
              setForm={setHouseForm}
              apartments={apartments}
              editingHouseId={editingHouseId}
              waitingForFirstApproval={waitingForFirstApproval}
              onSubmit={handleHouseSubmit}
              onCancel={() => {
                setHouseForm(emptyHouseForm);
                setEditingHouseId(null);
              }}
              onUseCurrentLocation={useCurrentLocation}
            />

            <ApartmentList
              houses={houses}
              apartments={apartments}
              loading={loading}
              onEdit={handleEditHouse}
              onDelete={handleDeleteHouse}
            />
          </section>
        )}

        {activeTab === "bookings" && (
          <section className="mt-6">
            <BookingList
              bookings={bookings}
              loading={loading}
              onUpdateStatus={handleBookingStatus}
              onMarkOccupied={handleMarkOccupied}
            />
          </section>
        )}

        {activeTab === "income" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <IncomeForm
              form={incomeForm}
              setForm={setIncomeForm}
              houses={houses}
              onSubmit={handleIncomeSubmit}
            />

            <IncomeList
              records={income}
              houses={houses}
              loading={loading}
              onDelete={handleDeleteIncome}
            />
          </section>
        )}

        {activeTab === "tenants" && (
          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <AnnouncementForm
              form={announcementForm}
              setForm={setAnnouncementForm}
              onSubmit={handleAnnouncementSubmit}
              announcements={announcements}
            />
            <TenantList
              tenants={tenants}
              loading={loading}
              overdueDrafts={overdueDrafts}
              onOverdueDraftChange={(bookingId, value) => setOverdueDrafts((current) => ({
                ...current,
                [bookingId]: value
              }))}
              onSendOverdue={handleSendOverdueNotice}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

function BuildingForm({ form, setForm, editingApartmentId, onSubmit, onCancel }) {
  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const updateUnitMix = (index, field, value) => {
    setForm((current) => ({
      ...current,
      unit_mix: current.unit_mix.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const addUnitMix = () => {
    setForm((current) => ({
      ...current,
      unit_mix: [...(current.unit_mix || []), { category: "single room", count: "" }]
    }));
  };

  const removeUnitMix = (index) => {
    setForm((current) => ({
      ...current,
      unit_mix: current.unit_mix.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{editingApartmentId ? "Edit Building" : "Add Building"}</h2>
        <Building2 size={18} className="text-blue-600" />
      </div>

      <Field label="Apartment / building name" name="name" value={form.name} onChange={update} />
      <Field label="Location" name="location" value={form.location} onChange={update} required={false} />
      <Field label="Number of floors" name="total_floors" type="number" value={form.total_floors} onChange={update} required={false} />
      <Field label="Notes" name="notes" value={form.notes} onChange={update} placeholder="Example: Wakulima apartment, near market..." required={false} />

      <div className="mb-4 rounded-md border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-semibold">Unit categories</p>
          <button type="button" onClick={addUnitMix} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100">
            Add category
          </button>
        </div>

        <div className="space-y-3">
          {(form.unit_mix || []).map((item, index) => (
            <div key={`${item.category}-${index}`} className="grid grid-cols-[minmax(0,1fr)_96px_40px] gap-2">
              <select
                value={item.category}
                onChange={(event) => updateUnitMix(index, "category", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 capitalize outline-none focus:border-blue-600"
              >
                {UNIT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input
                value={item.count}
                onChange={(event) => updateUnitMix(index, "count", event.target.value)}
                type="number"
                placeholder="Units"
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
              />
              <button
                type="button"
                aria-label={`Remove ${item.category || "category"}`}
                title="Remove category"
                onClick={() => removeUnitMix(index)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
          {editingApartmentId ? "Save building" : "Add building"}
        </button>
        {editingApartmentId && (
          <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function normalizeCategory(category) {
  return (category || "uncategorized").trim().toLowerCase();
}

function getPlannedUnitTotal(apartment) {
  return (apartment?.unit_mix || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function buildCategorySummary(apartment, units, rentedHouseIds) {
  const summaryMap = new Map();

  (apartment.unit_mix || []).forEach((item) => {
    const category = normalizeCategory(item.category);
    const current = summaryMap.get(category) || {
      category,
      planned: 0,
      saved: 0,
      occupied: 0,
      rented: 0
    };

    current.planned += Number(item.count || 0);
    summaryMap.set(category, current);
  });

  units.forEach((unit) => {
    const category = normalizeCategory(unit.house_category);
    const current = summaryMap.get(category) || {
      category,
      planned: 0,
      saved: 0,
      occupied: 0,
      rented: 0
    };

    current.saved += 1;

    if (unit.status === "occupied") {
      current.occupied += 1;
    }

    if (rentedHouseIds.has(Number(unit.id))) {
      current.rented += 1;
    }

    summaryMap.set(category, current);
  });

  return Array.from(summaryMap.values());
}

function BuildingList({ apartments, houses, bookings, loading, onEdit }) {
  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading buildings...</div>;
  }

  if (apartments.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No apartment buildings added yet.</div>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {apartments.map((apartment) => {
        const units = houses.filter((house) => Number(house.apartment_id) === Number(apartment.id));
        const rentedHouseIds = new Set(
          bookings
            .filter((booking) => booking.status === "rented")
            .map((booking) => Number(booking.house_id))
        );
        const categorySummary = buildCategorySummary(apartment, units, rentedHouseIds);
        const totalUnits = categorySummary.reduce((sum, item) => sum + (item.planned || item.saved), 0);
        const occupiedUnits = categorySummary.reduce((sum, item) => sum + item.occupied, 0);
        const rentedUnits = categorySummary.reduce((sum, item) => sum + item.rented, 0);

        return (
          <article key={apartment.id} className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{apartment.name}</h2>
                <p className="mt-1 text-slate-500">{apartment.location || "Location not set"}</p>
              </div>
              <IconButton label="Edit building" onClick={() => onEdit(apartment)} icon={Edit3} />
            </div>

            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <p>Floors: {apartment.total_floors || 0}</p>
              <p>Total units: {totalUnits}</p>
              <p>Saved units: {units.length}</p>
              <p>Occupied units: {occupiedUnits}</p>
              <p>Rented units: {rentedUnits}</p>
              <p>{apartment.notes || "No notes added."}</p>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">Unit summary by category</p>
              <div className="overflow-hidden rounded-md border border-slate-200 text-sm">
                <div className="grid grid-cols-[minmax(0,1fr)_72px_72px_84px_72px] bg-slate-100 px-3 py-2 text-xs font-bold uppercase text-slate-500">
                  <span>Category</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Saved</span>
                  <span className="text-right">Occupied</span>
                  <span className="text-right">Rented</span>
                </div>
                {categorySummary.map((item) => (
                  <div key={item.category} className="grid grid-cols-[minmax(0,1fr)_72px_72px_84px_72px] border-t border-slate-200 px-3 py-2 text-slate-700">
                    <span className="capitalize">{item.category}</span>
                    <span className="text-right font-semibold">{item.planned || item.saved}</span>
                    <span className="text-right">{item.saved}</span>
                    <span className="text-right">{item.occupied}</span>
                    <span className="text-right">{item.rented}</span>
                  </div>
                ))}
              </div>
            </div>

            {units.some((unit) => unit.status === "occupied") && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Occupied client details</p>
                <div className="space-y-2">
                  {units.filter((unit) => unit.status === "occupied").map((unit) => (
                    <div key={unit.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <p className="font-semibold">{unit.title} {unit.unit_number ? `- Unit ${unit.unit_number}` : ""}</p>
                      <p>{unit.customer_name || "Client name not set"}</p>
                      <p>{unit.customer_phone || "Phone not set"} {unit.customer_email ? `- ${unit.customer_email}` : ""}</p>
                      <p>Payment: {unit.customer_payment_status || "Not set"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ApartmentForm({ form, setForm, apartments, editingHouseId, waitingForFirstApproval, onSubmit, onCancel, onUseCurrentLocation }) {
  const [imageCategory, setImageCategory] = useState("bedroom");
  const [coverUploading, setCoverUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const updateBuilding = (event) => {
    const apartmentId = event.target.value;
    const selectedApartment = apartments.find((apartment) => Number(apartment.id) === Number(apartmentId));

    setForm((current) => ({
      ...current,
      apartment_id: apartmentId,
      total_floors: selectedApartment?.total_floors || "",
      total_houses: selectedApartment ? getPlannedUnitTotal(selectedApartment) || selectedApartment.units_count || "" : ""
    }));
  };

  const uploadFilesToCloudinary = async (files) => {
    const token = localStorage.getItem("owner_token");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Image upload failed");
    }

    return data.images && data.images.length ? data.images : (data.urls || []).map((url) => ({ url }));
  };

  const handleCoverImageFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setCoverUploading(true);
    setImageUploadError("");

    try {
      const [uploaded] = await uploadFilesToCloudinary([file]);

      if (!uploaded?.url && !uploaded?.secure_url) {
        throw new Error("Image upload failed");
      }

      setForm((current) => ({
        ...current,
        image: uploaded.url || uploaded.secure_url
      }));
    } catch (err) {
      setImageUploadError(err.message);
    } finally {
      setCoverUploading(false);
      event.target.value = "";
    }
  };

  const handleImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    setImageUploadError("");

    let uploadedImages = [];

    try {
      uploadedImages = await uploadFilesToCloudinary(files);
    } catch (err) {
      setImageUploadError(err.message);
      event.target.value = "";
      return;
    }

    const uploads = uploadedImages.map((image, index) => ({
      category: imageCategory,
      name: files[index]?.name || "Apartment image",
      url: image.url || image.secure_url,
      public_id: image.public_id
    }));

    setForm((current) => ({
      ...current,
      images: [
        ...(current.images || []),
        ...uploads
      ]
    }));

    event.target.value = "";
  };

  const removeCoverImage = () => {
    setForm((current) => ({
      ...current,
      image: ""
    }));
  };

  const removeImage = (index) => {
    setForm((current) => ({
      ...current,
      images: (current.images || []).filter((_, imageIndex) => imageIndex !== index)
    }));
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{editingHouseId ? "Edit Unit" : "Add Unit"}</h2>
        <Building2 size={18} className="text-blue-600" />
      </div>

      {!editingHouseId && waitingForFirstApproval && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Your first house is waiting for admin approval. You can post more houses after the admin approves it.
        </div>
      )}

      <Field label="Title" name="title" value={form.title} onChange={update} />
      <Field label="Area / address" name="location" value={form.location} onChange={update} />
      <Field label="Monthly rent" name="price" value={form.price} onChange={update} />
      <label className="mb-3 block text-sm font-medium text-slate-700">
        Building
        <select
          name="apartment_id"
          value={form.apartment_id}
          onChange={updateBuilding}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
        >
          <option value="">Standalone house / no building</option>
          {apartments.map((apartment) => (
            <option key={apartment.id} value={apartment.id}>{apartment.name}</option>
          ))}
        </select>
      </label>
      <Field label="Building name override" name="apartment_name" value={form.apartment_name} onChange={update} required={false} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total floors" name="total_floors" type="number" value={form.total_floors} onChange={update} required={false} />
        <Field label="Total houses" name="total_houses" type="number" value={form.total_houses} onChange={update} required={false} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Floor number" name="floor_number" value={form.floor_number} onChange={update} required={false} />
        <Field label="House / unit no." name="unit_number" value={form.unit_number} onChange={update} required={false} />
      </div>

      <label className="mb-3 block text-sm font-medium text-slate-700">
        House category
        <select
          name="house_category"
          value={form.house_category}
          onChange={update}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize outline-none focus:border-blue-600"
        >
          {UNIT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>

      <div className="mb-3 rounded-md border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-semibold">Cover image</p>
          <ImagePlus size={18} className="text-blue-600" />
        </div>

        {form.image ? (
          <div className="mb-3 overflow-hidden rounded-md border bg-white">
            <img src={form.image} alt="Cover preview" className="h-40 w-full object-cover" />
            <div className="flex items-center justify-between gap-2 p-2">
              <span className="truncate text-xs font-semibold text-slate-600">Cloudinary cover image</span>
              <button
                type="button"
                onClick={removeCoverImage}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600">
          {coverUploading ? "Uploading cover image..." : "Choose cover image from device"}
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverImageFile}
            disabled={coverUploading}
            className="sr-only"
          />
        </label>

        {imageUploadError && (
          <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {imageUploadError}
          </p>
        )}
      </div>

      <div className="mb-3 rounded-md border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-semibold">Apartment images</p>
          <ImagePlus size={18} className="text-blue-600" />
        </div>

        <label className="mb-3 block text-sm font-medium text-slate-700">
          Image category
          <select
            value={imageCategory}
            onChange={(event) => setImageCategory(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize outline-none focus:border-blue-600"
          >
            <option value="bedroom">Bedroom</option>
            <option value="kitchen">Kitchen</option>
            <option value="sitting area">Sitting area</option>
            <option value="bathroom">Bathroom</option>
            <option value="exterior">Exterior</option>
            <option value="balcony">Balcony</option>
            <option value="compound">Compound</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600">
          Choose images from device
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageFiles}
            className="sr-only"
          />
        </label>

        {(form.images || []).length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {form.images.map((image, index) => (
              <div key={`${image.name}-${index}`} className="overflow-hidden rounded-md border bg-white">
                <img
                  src={getImageSrc(image)}
                  alt={image.category}
                  className="h-24 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-2 p-2">
                  <span className="truncate text-xs font-semibold capitalize text-slate-600">
                    {image.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Beds" name="beds" type="number" value={form.beds} onChange={update} />
        <Field label="Baths" name="baths" type="number" value={form.baths} onChange={update} />
      </div>

      <label className="mb-3 block text-sm font-medium text-slate-700">
        Status
        <select
          name="status"
          value={form.status}
          onChange={update}
          disabled
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize outline-none focus:border-blue-600"
        >
          <option value="pending">pending</option>
          <option value="active">active</option>
          <option value="verified">verified</option>
          <option value="occupied">occupied</option>
          <option value="suspended">suspended</option>
        </select>
        {!editingHouseId && (
          <span className="mt-1 block text-xs text-slate-500">New listings are submitted as pending until an admin approves them.</span>
        )}
      </label>

      <div className="mb-3 rounded-md border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-semibold">Pinned location</p>
          <button
            type="button"
            onClick={onUseCurrentLocation}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <MapPin size={15} />
            Use current
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" name="latitude" value={form.latitude} onChange={update} required={false} />
          <Field label="Longitude" name="longitude" value={form.longitude} onChange={update} required={false} />
        </div>
      </div>

      <Field label="Occupied until" name="occupied_until" type="date" value={form.occupied_until} onChange={update} required={false} />
      <Field label="Move-in date" name="customer_move_in_date" type="date" value={form.customer_move_in_date} onChange={update} required={false} />
      <Field label="Customer name" name="customer_name" value={form.customer_name} onChange={update} required={false} />
      <Field label="Customer phone" name="customer_phone" value={form.customer_phone} onChange={update} required={false} />
      <Field label="Customer email" name="customer_email" type="email" value={form.customer_email} onChange={update} required={false} />
      <Field label="Payment status" name="customer_payment_status" value={form.customer_payment_status} onChange={update} placeholder="Paid, pending, overdue..." required={false} />
      <Field label="Vacate request" name="vacate_request" value={form.vacate_request} onChange={update} placeholder="No request, notice date, reason..." required={false} />
      <Field label="Condition report" name="condition_report" value={form.condition_report} onChange={update} placeholder="Repairs, complaints, inspection notes..." required={false} />
      <Field label="Expected monthly income" name="monthly_income" type="number" value={form.monthly_income} onChange={update} required={false} />

      <div className="mt-4 flex gap-3">
        <button
          disabled={!editingHouseId && waitingForFirstApproval}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          <CheckCircle2 size={16} />
          {editingHouseId ? "Save" : waitingForFirstApproval ? "Waiting for approval" : "Submit for approval"}
        </button>
        {editingHouseId && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function ApartmentList({ houses, apartments, loading, onEdit, onDelete }) {
  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading apartments...</div>;
  }

  if (houses.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No units uploaded yet.</div>;
  }

  const apartmentNames = Object.fromEntries(apartments.map((apartment) => [apartment.id, apartment.name]));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {houses.map((house) => (
        <article id={`owner-house-${house.id}`} key={house.id} className="overflow-hidden rounded-lg border bg-white shadow-sm scroll-mt-28">
          {house.image ? (
            <img src={house.image} alt={house.title} className="h-48 w-full object-cover" />
          ) : (
            <div className="flex h-48 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
              No cover image
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{house.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-slate-500">
                  <MapPin size={15} />
                  {house.location}
                </p>
              </div>
              <StatusBadge status={house.status} />
            </div>

            <p className="mt-4 text-xl font-bold text-blue-600">Ksh {house.price}</p>
            <div className="mt-3 flex gap-5 text-slate-600">
              <span className="flex items-center gap-1"><Bed size={15} />{house.beds} beds</span>
              <span className="flex items-center gap-1"><Bath size={15} />{house.baths} baths</span>
            </div>

            <div className="mt-4 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                {apartmentNames[house.apartment_id] || house.apartment_name || "Standalone house"} {house.unit_number ? `- Unit ${house.unit_number}` : ""}
              </p>
              <p>Category: {house.house_category || "Not set"}</p>
              <p>Floors: {house.total_floors || 0} total, current floor {house.floor_number || "-"}</p>
              <p>Houses in apartment: {house.total_houses || 0}</p>
              <p>Customer: {house.customer_name || "None saved"}</p>
              <p>Payment status: {house.customer_payment_status || "Not set"}</p>
              <p>Move-in date: {house.customer_move_in_date || "Not set"}</p>
              <p>Occupied until: {house.occupied_until || "Not set"}</p>
              <p>Monthly income: Ksh {Number(house.monthly_income || 0).toLocaleString()}</p>
              <p>Vacate request: {house.vacate_request || "None"}</p>
              <p>Condition report: {house.condition_report || "No report"}</p>
              {house.latitude && house.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${house.latitude},${house.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-semibold text-blue-600 hover:text-blue-700"
                >
                  Open pinned location
                </a>
              )}
            </div>

            {(house.images || []).length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-slate-700">Image gallery</p>
                <div className="grid grid-cols-3 gap-2">
                  {house.images.slice(0, 6).map((image, index) => (
                    <div key={`${image.name}-${index}`} className="overflow-hidden rounded-md border">
                      <img
                        src={getImageSrc(image)}
                        alt={image.category}
                        className="h-20 w-full object-cover"
                      />
                      <p className="truncate px-2 py-1 text-xs font-semibold capitalize text-slate-500">
                        {image.category}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <IconButton label="Edit apartment" onClick={() => onEdit(house)} icon={Edit3} />
              <IconButton label="Delete apartment" onClick={() => onDelete(house.id)} icon={Trash2} danger />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function BookingList({ bookings, loading, onUpdateStatus, onMarkOccupied }) {
  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading booking notifications...</div>;
  }

  if (bookings.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No booking notifications yet.</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {bookings.map((booking) => (
        <article id={`owner-booking-${booking.id}`} key={booking.id} className="rounded-lg border bg-white p-5 shadow-sm scroll-mt-28">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Booking request</p>
              <h2 className="mt-1 text-xl font-bold">{booking.house_title}</h2>
              <p className="mt-1 text-sm text-slate-500">{booking.created_at || "Date not set"}</p>
            </div>
            <StatusBadge status={booking.status} />
          </div>

          <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">{booking.finder_name || "Home finder"}</p>
            <p>{booking.finder_phone || "Phone not set"}</p>
            <p>{booking.finder_email || "Email not set"}</p>
            <p className="mt-3 text-slate-600">{booking.message || "Interested in this apartment."}</p>
            {booking.visit_requested && (
              <p className="mt-3 rounded-md bg-emerald-50 p-2 text-emerald-700">Visit request: {booking.visit_requested}</p>
            )}
            {booking.condition_message && (
              <p className="mt-3 rounded-md bg-amber-50 p-2 text-amber-800">Condition message: {booking.condition_message}</p>
            )}
            {booking.vacate_request && (
              <p className="mt-3 rounded-md bg-red-50 p-2 text-red-700">Vacate request: {booking.vacate_request}</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUpdateStatus(booking.id, "contacted")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            >
              Mark contacted
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(booking.id, "approved")}
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Approve
            </button>
            {booking.status === "approved" && (
              <button
                type="button"
                onClick={() => onMarkOccupied(booking.id)}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Mark rented / occupied
              </button>
            )}
            <button
              type="button"
              onClick={() => onUpdateStatus(booking.id, "declined")}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Decline
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function IncomeForm({ form, setForm, houses, onSubmit }) {
  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">Record Rent Income</h2>

      <label className="mb-3 block text-sm font-medium text-slate-700">
        Apartment
        <select
          name="house_id"
          value={form.house_id}
          required
          onChange={update}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
        >
          <option value="">Choose apartment</option>
          {houses.map((house) => (
            <option key={house.id} value={house.id}>{house.title}</option>
          ))}
        </select>
      </label>

      <Field label="Customer name" name="customer_name" value={form.customer_name} onChange={update} />
      <Field label="Customer phone" name="customer_phone" value={form.customer_phone} onChange={update} required={false} />
      <Field label="Amount paid" name="amount" type="number" value={form.amount} onChange={update} />
      <Field label="Paid for" name="paid_for" value={form.paid_for} onChange={update} placeholder="May rent, deposit..." required={false} />
      <Field label="Paid on" name="paid_on" type="date" value={form.paid_on} onChange={update} required={false} />
      <Field label="Notes" name="notes" value={form.notes} onChange={update} required={false} />

      <button className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
        <Receipt size={16} />
        Save income
      </button>
    </form>
  );
}

function IncomeList({ records, houses, loading, onDelete }) {
  const houseNames = Object.fromEntries(houses.map((house) => [house.id, house.title]));

  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading income records...</div>;
  }

  if (records.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No income records saved yet.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Apartment</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Paid for</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="px-4 py-3 font-semibold">{houseNames[record.house_id] || "Apartment"}</td>
              <td className="px-4 py-3">
                <p className="font-semibold">{record.customer_name}</p>
                <p className="text-slate-500">{record.customer_phone}</p>
              </td>
              <td className="px-4 py-3 font-bold text-blue-600">Ksh {Number(record.amount || 0).toLocaleString()}</td>
              <td className="px-4 py-3">{record.paid_for || "-"}</td>
              <td className="px-4 py-3">{record.paid_on || "-"}</td>
              <td className="px-4 py-3 text-right">
                <IconButton label="Delete income" onClick={() => onDelete(record.id)} icon={Trash2} danger />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnnouncementForm({ form, setForm, onSubmit, announcements }) {
  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Create Announcement</h2>
        <Field label="Title" name="title" value={form.title} onChange={update} />
        <label className="mb-3 block text-sm font-medium text-slate-700">
          Message
          <textarea
            name="message"
            value={form.message}
            required
            onChange={update}
            className="mt-1 min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
          />
        </label>
        <button className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
          Send announcement
        </button>
      </form>

      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Recent Announcements</h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((announcement) => (
              <div key={announcement.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-1 text-slate-600">{announcement.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TenantList({ tenants, loading, overdueDrafts, onOverdueDraftChange, onSendOverdue }) {
  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading tenants...</div>;
  }

  if (tenants.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No tenants yet.</div>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {tenants.map((tenant) => {
        const latestPayment = tenant.payments?.[0];
        const expectedRent = getExpectedRent(tenant);
        const balance = getTenantBalance(tenant);
        const isOverdue = balance > 0 || tenant.house?.customer_payment_status === "rent overdue";
        const defaultOverdueMessage = `Your rent for ${tenant.house?.title || tenant.booking.house_title} is overdue. Balance: Ksh ${balance.toLocaleString()}. Please clear it as soon as possible.`;

        return (
          <article id={`owner-tenant-${tenant.booking.id}`} key={tenant.booking.id} className={`rounded-lg border bg-white p-5 shadow-sm scroll-mt-28 ${isOverdue ? "border-red-200" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{tenant.booking.finder_name || tenant.house?.customer_name || "Tenant"}</h2>
                <p className="mt-1 text-sm text-slate-500">{tenant.house?.title || tenant.booking.house_title}</p>
              </div>
              <StatusBadge status={isOverdue ? "overdue" : tenant.house?.customer_payment_status || "rented"} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-500">Monthly rent</p>
                <p className="mt-1 text-lg font-bold text-slate-900">Ksh {expectedRent.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase text-emerald-700">Latest paid</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">
                  Ksh {Number(latestPayment?.amount || 0).toLocaleString()}
                </p>
              </div>
              <div className={`rounded-md p-3 ${balance > 0 ? "bg-red-50" : "bg-blue-50"}`}>
                <p className={`text-xs font-bold uppercase ${balance > 0 ? "text-red-700" : "text-blue-700"}`}>Balance</p>
                <p className={`mt-1 text-lg font-bold ${balance > 0 ? "text-red-800" : "text-blue-800"}`}>
                  Ksh {balance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p>Phone: {tenant.booking.finder_phone || tenant.house?.customer_phone || "-"}</p>
              <p>Email: {tenant.booking.finder_email || tenant.house?.customer_email || "-"}</p>
              <p>Move-in: {tenant.house?.customer_move_in_date || "-"}</p>
              <p>Latest payment: {latestPayment ? `Ksh ${Number(latestPayment.amount || 0).toLocaleString()} for ${latestPayment.paid_for || "rent"}` : "No payment yet"}</p>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-700">Messages</p>
              {tenant.booking.rent_overdue_notice && (
                <p className="rounded-md bg-red-50 p-2 text-red-700">Rent overdue notice: {tenant.booking.rent_overdue_notice}</p>
              )}
              <p className="rounded-md bg-amber-50 p-2 text-amber-800">Condition: {tenant.booking.condition_message || "No message"}</p>
              <p className="rounded-md bg-red-50 p-2 text-red-700">Vacate: {tenant.booking.vacate_request || "No request"}</p>
            </div>

            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3">
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-red-800">
                <AlertTriangle size={16} />
                Rent overdue notice
              </p>
              <textarea
                value={overdueDrafts[tenant.booking.id] || ""}
                onChange={(event) => onOverdueDraftChange(tenant.booking.id, event.target.value)}
                placeholder={defaultOverdueMessage}
                className="min-h-20 w-full resize-y rounded-md border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => onSendOverdue(tenant)}
                disabled={balance <= 0 && !overdueDrafts[tenant.booking.id]?.trim()}
                className="mt-2 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                <Send size={15} />
                Send rent overdue
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function getExpectedRent(tenant) {
  return Number(tenant.house?.monthly_income || tenant.house?.price || 0);
}

function getTenantBalance(tenant) {
  if (typeof tenant.rent_balance === "number") {
    return tenant.rent_balance;
  }

  const latestPayment = tenant.payments?.[0];

  return Math.max(getExpectedRent(tenant) - Number(latestPayment?.amount || 0), 0);
}

function getImageSrc(image) {
  if (typeof image === "string") {
    return image;
  }

  return image?.url || image?.src || image?.data_url || "";
}

function Field({ label, name, type = "text", value, onChange, placeholder = "", required = true }) {
  return (
    <label className="mb-3 block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
      />
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    occupied: "bg-blue-100 text-blue-700",
    pending: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-slate-100 text-slate-700",
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    rented: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    "rent overdue": "bg-red-100 text-red-700"
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function IconButton({ label, onClick, icon: Icon, danger = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-md border p-2 ${danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
    >
      <Icon size={16} />
    </button>
  );
}

export default OwnerDashboard;
