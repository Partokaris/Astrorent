import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  Filter,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserCheck,
  Users,
  X,
  XCircle
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import VerificationBadge from "../components/VerificationBadge";

const API_URL = "http://127.0.0.1:5000";
const PAGE_SIZE = 6;
const statusOptions = ["all", "pending", "verified", "rejected", "suspended", "active", "occupied"];
const settingsStorageKey = "admin_dashboard_settings";

const defaultAdminSettings = {
  darkMode: false,
  autoRefresh: false,
  refreshInterval: "60",
  defaultView: "overview",
  defaultStatusFilter: "all",
  defaultSortBy: "newest",
  compactTables: false,
  propertyAlerts: true,
  bookingAlerts: true,
  ownerAlerts: true,
  browserNotifications: false,
  moderationMode: "manual",
  requireMapPin: true,
  requireOwnerIdentity: true,
  exportFormat: "csv",
  includeImages: true,
  sessionTimeout: "30"
};

const navItems = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "verification", label: "Property Verification", icon: ClipboardCheck },
  { id: "properties", label: "All Properties", icon: Building2 },
  { id: "owners", label: "Property Owners", icon: Users },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings }
];

function loadAdminSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");

    return { ...defaultAdminSettings, ...stored };
  } catch {
    return defaultAdminSettings;
  }
}

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");
  const [settings, setSettings] = useState(loadAdminSettings);
  const [activeView, setActiveView] = useState(() => loadAdminSettings().defaultView);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [houses, setHouses] = useState([]);
  const [owners, setOwners] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [notes, setNotes] = useState({});
  const [activity, setActivity] = useState([
    "Verification center initialized",
    "Revenue monitor synced",
    "Suspicious listing scan ready"
  ]);

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }), [token]);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }, [authHeaders]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [houseData, ownerData, bookingData, adminData] = await Promise.all([
        request("/api/admin/houses"),
        request("/api/owners").catch(() => []),
        request("/api/bookings").catch(() => []),
        request("/api/admin/me").catch(() => null)
      ]);

      setHouses(houseData);
      setOwners(ownerData);
      setBookings(bookingData);
      setAdmin(adminData);
    } catch (err) {
      showToast("error", err.message);

      if (err.message.toLowerCase().includes("token")) {
        localStorage.removeItem("admin_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, request, showToast]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (settings.browserNotifications && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.browserNotifications]);

  useEffect(() => {
    if (!settings.autoRefresh) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      Promise.resolve().then(loadDashboard);
    }, Number(settings.refreshInterval) * 1000);

    return () => window.clearInterval(interval);
  }, [loadDashboard, settings.autoRefresh, settings.refreshInterval]);

  const normalizedHouses = useMemo(() => houses.map((house) => ({
    ...house,
    displayStatus: house.status === "active" ? "verified" : house.status || "pending",
    submittedAt: house.created_at || house.customer_move_in_date || house.occupied_until || ""
  })), [houses]);

  const stats = useMemo(() => {
    const pending = normalizedHouses.filter((house) => house.displayStatus === "pending").length;
    const verified = normalizedHouses.filter((house) => house.displayStatus === "verified").length;
    const suspended = normalizedHouses.filter((house) => house.displayStatus === "suspended").length;
    const revenue = normalizedHouses.reduce((sum, house) => sum + Number(house.monthly_income || house.price || 0), 0);

    return [
      { label: "Total Properties", value: normalizedHouses.length, icon: Building2, color: "blue", targetView: "properties", targetStatus: "all" },
      { label: "Pending Verification", value: pending, icon: AlertTriangle, color: "yellow", targetView: "verification", targetStatus: "pending" },
      { label: "Verified Properties", value: verified, icon: ShieldCheck, color: "green", targetView: "properties", targetStatus: "verified" },
      { label: "Suspended Listings", value: suspended, icon: ShieldAlert, color: "red", targetView: "properties", targetStatus: "suspended" },
      { label: "Total Owners", value: owners.length, icon: Users, color: "blue", targetView: "owners" },
      { label: "Total Bookings", value: bookings.length, icon: CalendarCheck, color: "green", targetView: "bookings" },
      { label: "Revenue Summary", value: `Ksh ${revenue.toLocaleString()}`, icon: BarChart3, color: "blue", targetView: "reports" }
    ];
  }, [bookings.length, normalizedHouses, owners.length]);

  const adminNotifications = useMemo(() => {
    const propertyUpdates = settings.propertyAlerts ? normalizedHouses
      .filter((house) => ["pending", "rejected", "suspended"].includes(house.displayStatus))
      .map((house) => ({
        id: `admin-property-${house.id}-${house.displayStatus}`,
        title: house.displayStatus === "pending" ? "Property waiting for review" : `Property ${house.displayStatus}`,
        body: `${house.title || "A property"} in ${house.location || "an unknown location"} needs admin attention.`,
        time: house.submittedAt || `property-${house.id}`,
        targetView: house.displayStatus === "pending" ? "verification" : "properties",
        targetId: `admin-property-${house.id}`
      })) : [];

    const bookingUpdates = settings.bookingAlerts ? bookings
      .filter((booking) => ["new", "approved", "rented"].includes(booking.status))
      .map((booking) => ({
        id: `admin-booking-${booking.id}-${booking.status}`,
        title: booking.status === "new" ? "New booking request" : `Booking ${booking.status}`,
        body: `${booking.finder_name || "A home finder"} has an update on ${booking.house_title || "a property"}.`,
        time: booking.created_at || `booking-${booking.id}`,
        targetView: "bookings",
        targetId: `admin-booking-${booking.id}`
      })) : [];

    const ownerUpdates = settings.ownerAlerts ? owners
      .filter((owner) => !owner.identity_verified || owner.status === "suspended")
      .map((owner) => ({
        id: `admin-owner-${owner.id}-${owner.identity_verified}-${owner.status}`,
        title: owner.status === "suspended" ? "Owner account suspended" : "Owner identity pending",
        body: `${owner.name || "A property owner"} has an account update to review.`,
        time: `owner-${owner.id}`,
        targetView: "owners",
        targetId: `admin-owner-${owner.id}`
      })) : [];

    return [...propertyUpdates, ...bookingUpdates, ...ownerUpdates].slice(0, 12);
  }, [bookings, normalizedHouses, owners, settings.bookingAlerts, settings.ownerAlerts, settings.propertyAlerts]);

  const openNotificationTarget = (notification) => {
    setActiveView(notification.targetView || "overview");

    window.setTimeout(() => {
      document.getElementById(notification.targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 80);
  };

  const openStatsTarget = (item) => {
    if (!item.targetView) {
      return;
    }

    setActiveView(item.targetView);
    setSelectedIds([]);
    setPage(1);

    if (item.targetStatus) {
      setStatusFilter(item.targetStatus);
      setQuery("");
    }

    window.setTimeout(() => {
      document.getElementById("admin-verification-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 80);
  };

  const filteredHouses = useMemo(() => {
    const needle = query.toLowerCase();

    return normalizedHouses
      .filter((house) => {
        const matchesStatus = statusFilter === "all" || house.displayStatus === statusFilter || house.status === statusFilter;
        const text = `${house.title} ${house.location} ${house.price} ${house.owner_name || ""}`.toLowerCase();

        return matchesStatus && text.includes(needle);
      })
      .sort((a, b) => {
        if (sortBy === "status") {
          return a.displayStatus.localeCompare(b.displayStatus);
        }

        if (sortBy === "price") {
          return Number(b.price || 0) - Number(a.price || 0);
        }

        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [normalizedHouses, query, sortBy, statusFilter]);

  const pagedHouses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;

    return filteredHouses.slice(start, start + PAGE_SIZE);
  }, [filteredHouses, page]);

  const totalPages = Math.max(1, Math.ceil(filteredHouses.length / PAGE_SIZE));

  const updateHouseStatus = async (houseIds, status, actionLabel) => {
    try {
      await Promise.all(houseIds.map((houseId) => request(`/api/houses/${houseId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      })));
      setSelectedIds([]);
      setConfirmAction(null);
      setActivity((current) => [`${actionLabel} ${houseIds.length} propert${houseIds.length === 1 ? "y" : "ies"}`, ...current].slice(0, 6));
      showToast("success", `${actionLabel} completed`);
      await loadDashboard();
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const updateOwner = async (ownerId, patch) => {
    try {
      const path = "identity_verified" in patch ? `/api/owners/${ownerId}/verify` : `/api/owners/${ownerId}/status`;
      await request(path, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      showToast("success", "Owner updated");
      await loadDashboard();
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const applySettingsDefaults = () => {
    setActiveView(settings.defaultView);
    setStatusFilter(settings.defaultStatusFilter);
    setSortBy(settings.defaultSortBy);
    setPage(1);
    showToast("success", "Dashboard defaults applied");
  };

  const resetSettings = () => {
    setSettings(defaultAdminSettings);
    setActiveView(defaultAdminSettings.defaultView);
    setStatusFilter(defaultAdminSettings.defaultStatusFilter);
    setSortBy(defaultAdminSettings.defaultSortBy);
    showToast("success", "Settings reset");
  };

  const exportDashboardData = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      admin: admin || {},
      settings: {
        format: settings.exportFormat,
        include_images: settings.includeImages
      },
      houses: settings.includeImages ? normalizedHouses : normalizedHouses.map(({ images, image, ...house }) => house),
      owners,
      bookings
    };
    const format = settings.exportFormat;
    const content = format === "json" ? JSON.stringify(payload, null, 2) : toCsv(payload.houses);
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `astrorent-admin-export.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("success", "Dashboard export prepared");
  };

  const appClass = settings.darkMode ? "dark" : "";

  return (
    <div className={appClass}>
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Sidebar
          activeView={activeView}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={(view) => {
            setActiveView(view);
            setSidebarOpen(false);
          }}
          onLogout={handleLogout}
        />

        <div className="lg:pl-72">
          <Navbar
            admin={admin}
            notifications={adminNotifications}
            onNotificationClick={openNotificationTarget}
            darkMode={settings.darkMode}
            onMenu={() => setSidebarOpen(true)}
            onToggleDark={() => updateSetting("darkMode", !settings.darkMode)}
          />

          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <PageHeader activeView={activeView} onExport={exportDashboardData} />

            {loading ? (
              <SkeletonDashboard />
            ) : activeView === "owners" ? (
              <OwnerManagement owners={owners} onUpdateOwner={updateOwner} />
            ) : activeView === "bookings" ? (
              <BookingManagement bookings={bookings} houses={normalizedHouses} settings={settings} />
            ) : activeView === "reports" ? (
              <ReportsPanel stats={stats} houses={normalizedHouses} activity={activity} />
            ) : activeView === "settings" ? (
              <SettingsPanel
                admin={admin}
                settings={settings}
                stats={stats}
                onApplyDefaults={applySettingsDefaults}
                onExport={exportDashboardData}
                onReset={resetSettings}
                onToggleDark={() => updateSetting("darkMode", !settings.darkMode)}
                onUpdateSetting={updateSetting}
              />
            ) : (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                  {stats.map((item) => <StatsCard key={item.label} item={item} onClick={() => openStatsTarget(item)} />)}
                </section>

                <section id="admin-verification-section" className="mt-6 grid scroll-mt-28 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">
                    <VerificationToolbar
                      query={query}
                      statusFilter={statusFilter}
                      sortBy={sortBy}
                      selectedCount={selectedIds.length}
                      onQuery={(value) => {
                        setQuery(value);
                        setPage(1);
                      }}
                      onStatusFilter={(value) => {
                        setStatusFilter(value);
                        setPage(1);
                      }}
                      onSort={(value) => {
                        setSortBy(value);
                        setPage(1);
                      }}
                      onBulkApprove={() => setConfirmAction({
                        title: "Approve selected properties?",
                        body: "Selected listings will receive the verified badge and become public verified properties.",
                        action: () => updateHouseStatus(selectedIds, "verified", "Approved")
                      })}
                      onBulkReject={() => setConfirmAction({
                        title: "Reject selected properties?",
                        body: "Selected listings will be marked rejected and removed from public verified inventory.",
                        danger: true,
                        action: () => updateHouseStatus(selectedIds, "rejected", "Rejected")
                      })}
                    />

                    <DataTable
                      houses={activeView === "verification" ? pagedHouses.filter((house) => house.displayStatus === "pending") : pagedHouses}
                      compact={settings.compactTables}
                      selectedIds={selectedIds}
                      onSelect={(houseId) => setSelectedIds((current) => (
                        current.includes(houseId) ? current.filter((id) => id !== houseId) : [...current, houseId]
                      ))}
                      onSelectAll={(checked) => setSelectedIds(checked ? pagedHouses.map((house) => house.id) : [])}
                      onView={setSelectedProperty}
                      onApprove={(house) => setConfirmAction({
                        title: "Approve this property?",
                        body: `${house.title} will receive a verified badge.`,
                        action: () => updateHouseStatus([house.id], "verified", "Approved")
                      })}
                      onReject={(house) => setConfirmAction({
                        title: "Reject this property?",
                        body: `${house.title} will be marked rejected.`,
                        danger: true,
                        action: () => updateHouseStatus([house.id], "rejected", "Rejected")
                      })}
                      onSuspend={(house) => setConfirmAction({
                        title: "Suspend this listing?",
                        body: `${house.title} will no longer appear as available.`,
                        danger: true,
                        action: () => updateHouseStatus([house.id], "suspended", "Suspended")
                      })}
                    />

                    <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                  </div>

                  <RecentActionsPanel activity={activity} houses={normalizedHouses} />
                </section>
              </>
            )}
          </main>
        </div>

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        {selectedProperty && (
          <PropertyModal
            property={selectedProperty}
            note={notes[selectedProperty.id] || ""}
            onNote={(value) => setNotes((current) => ({ ...current, [selectedProperty.id]: value }))}
            onClose={() => setSelectedProperty(null)}
            onApprove={() => updateHouseStatus([selectedProperty.id], "verified", "Approved")}
            onReject={() => updateHouseStatus([selectedProperty.id], "rejected", "Rejected")}
            onSuspend={() => updateHouseStatus([selectedProperty.id], "suspended", "Suspended")}
          />
        )}
        {confirmAction && <ConfirmModal config={confirmAction} onCancel={() => setConfirmAction(null)} />}
      </div>
    </div>
  );
}

function Sidebar({ activeView, open, onClose, onNavigate, onLogout }) {
  return (
    <>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={onClose} aria-label="Close menu" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-200">
              <Home size={22} />
            </span>
            <span>
              <span className="block text-lg font-black text-blue-600">AstroRent</span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Suite</span>
            </span>
          </Link>
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold transition ${
                  active
                    ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-950 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function Navbar({ admin, notifications, onNotificationClick, darkMode, onMenu, onToggleDark }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-md border border-slate-200 p-2 lg:hidden dark:border-slate-700" onClick={onMenu}>
            <Menu size={20} />
          </button>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Operations Control</p>
            <h1 className="text-xl font-black sm:text-2xl">Property Verification Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={onToggleDark} aria-label="Toggle dark mode">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationBell notifications={notifications} storageKey="admin_read_notifications" onNotificationClick={onNotificationClick} />
          <div className="hidden items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex dark:border-slate-700 dark:bg-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 font-black text-white">
              {(admin?.name || "A").slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-bold">{admin?.name || "Admin"}</p>
              <p className="text-xs capitalize text-slate-500">{admin?.role || "Platform admin"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function PageHeader({ activeView, onExport }) {
  const titles = {
    overview: ["Dashboard Overview", "Monitor listings, owners, bookings, and revenue health."],
    verification: ["Property Verification", "Review newly submitted properties and approve only legitimate listings."],
    properties: ["All Properties", "Search, filter, verify, suspend, and inspect every property."],
    owners: ["Property Owners", "Manage owner identity, activity, and account standing."],
    bookings: ["Booking Management", "Monitor booking requests, occupied homes, and suspicious patterns."],
    reports: ["Reports", "Track verification throughput and platform quality signals."],
    settings: ["Settings", "Tune dashboard preferences and moderation workflows."]
  };
  const [title, subtitle] = titles[activeView] || titles.overview;

  return (
    <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
      </div>
      <button onClick={onExport} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
        <Download size={16} />
        Export
      </button>
    </section>
  );
}

function StatsCard({ item, onClick }) {
  const Icon = item.icon;
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    yellow: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100"
  };

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-md border ${colorMap[item.color]}`}>
          <Icon size={21} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Live</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
      <p className="mt-2 text-2xl font-black">{item.value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      {content}
    </article>
  );
}

function VerificationToolbar({ query, statusFilter, sortBy, selectedCount, onQuery, onStatusFilter, onSort, onBulkApprove, onBulkReject }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search property, owner, location, price"
            className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <SelectWithIcon icon={Filter} value={statusFilter} onChange={onStatusFilter} options={statusOptions} />
        <SelectWithIcon icon={SlidersHorizontal} value={sortBy} onChange={onSort} options={["newest", "status", "price"]} />
        <div className="flex gap-2">
          <button disabled={!selectedCount} onClick={onBulkApprove} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300">
            Bulk approve
          </button>
          <button disabled={!selectedCount} onClick={onBulkReject} className="rounded-md border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
            Reject
          </button>
        </div>
      </div>
    </section>
  );
}

function SelectWithIcon({ icon: Icon, value, onChange, options }) {
  return (
    <label className="relative block">
      <Icon size={16} className="absolute left-3 top-3.5 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold capitalize outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function DataTable({ houses, compact, selectedIds, onSelect, onSelectAll, onView, onApprove, onReject, onSuspend }) {
  const allSelected = houses.length > 0 && houses.every((house) => selectedIds.includes(house.id));

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-slate-200 dark:divide-slate-800 ${compact ? "text-xs" : "text-sm"}`}>
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-4">
                <input type="checkbox" checked={allSelected} onChange={(event) => onSelectAll(event.target.checked)} />
              </th>
              <th className="px-4 py-4">Property</th>
              <th className="px-4 py-4">Owner</th>
              <th className="px-4 py-4">Submitted</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {houses.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                  <EmptyState title="No properties found" body="Try changing the filters or search terms." />
                </td>
              </tr>
            ) : houses.map((house) => (
              <tr id={`admin-property-${house.id}`} key={house.id} className="transition scroll-mt-28 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-4">
                  <input type="checkbox" checked={selectedIds.includes(house.id)} onChange={() => onSelect(house.id)} />
                </td>
                <td className="px-4 py-4">
                  <PropertyCell house={house} />
                </td>
                <td className="px-4 py-4">
                  <p className="font-bold">{house.owner_name || "Owner pending"}</p>
                  <p className="text-xs text-slate-500">{house.owner_email || "No email on record"}</p>
                </td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{formatDate(house.submittedAt) || "Recent"}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={house.displayStatus} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <IconButton label="View details" icon={Eye} onClick={() => onView(house)} />
                    <IconButton label="Approve" icon={CheckCircle2} onClick={() => onApprove(house)} success />
                    <IconButton label="Reject" icon={XCircle} onClick={() => onReject(house)} danger />
                    <IconButton label="Suspend" icon={ShieldAlert} onClick={() => onSuspend(house)} warning />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PropertyCell({ house }) {
  return (
    <div className="flex min-w-[260px] items-center gap-3">
      <img src={getImageSrc(house)} alt={house.title} className="h-16 w-20 rounded-md object-cover ring-1 ring-slate-200" />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black">{house.title || "Untitled property"}</p>
          <VerificationBadge status={house.displayStatus} compact />
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={13} />
          {house.location || "Location not added"}
        </p>
        <p className="mt-1 text-sm font-bold text-blue-600">Ksh {house.price || 0}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    suspended: "bg-red-50 text-red-700 border-red-200",
    occupied: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200"
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black capitalize ${styles[status] || styles.pending}`}>
      {status === "active" ? "verified" : status}
    </span>
  );
}

function IconButton({ label, icon: Icon, onClick, success, danger, warning }) {
  const color = success
    ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
    : danger
      ? "border-red-200 text-red-600 hover:bg-red-50"
      : warning
        ? "border-amber-200 text-amber-700 hover:bg-amber-50"
        : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded-md border p-2 transition ${color}`}>
      <Icon size={16} />
    </button>
  );
}

function RecentActionsPanel({ activity, houses }) {
  const pending = houses.filter((house) => house.displayStatus === "pending").slice(0, 3);

  return (
    <aside className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-black">Recent actions</h3>
        <div className="mt-4 space-y-3">
          {activity.map((item) => (
            <div key={item} className="flex gap-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">{item}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-black">Priority queue</h3>
        <div className="mt-4 space-y-3">
          {pending.length === 0 ? <EmptyState title="Queue clear" body="No pending verification items." /> : pending.map((house) => (
            <div key={house.id} className="rounded-md border border-amber-100 bg-amber-50 p-3">
              <p className="font-bold text-amber-900">{house.title}</p>
              <p className="text-xs text-amber-700">{house.location}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function OwnerManagement({ owners, onUpdateOwner }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <h3 className="text-xl font-black">Property Owners</h3>
        <p className="mt-1 text-sm text-slate-500">Verify identity, review property counts, and suspend risky accounts.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-4">Owner</th>
              <th className="px-4 py-4">Identity</th>
              <th className="px-4 py-4">Properties</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {owners.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-12"><EmptyState title="No owners yet" body="Owner accounts will appear here after signup." /></td></tr>
            ) : owners.map((owner) => (
              <tr id={`admin-owner-${owner.id}`} key={owner.id} className="scroll-mt-28 hover:bg-slate-50 dark:hover:bg-slate-800">
                <td className="px-4 py-4">
                  <p className="font-black">{owner.name}</p>
                  <p className="text-slate-500">{owner.email} | {owner.phone}</p>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={owner.identity_verified ? "verified" : "pending"} />
                </td>
                <td className="px-4 py-4 font-bold">{owner.property_count}</td>
                <td className="px-4 py-4"><StatusBadge status={owner.status || "active"} /></td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <IconButton label="Verify identity" icon={UserCheck} success onClick={() => onUpdateOwner(owner.id, { identity_verified: !owner.identity_verified })} />
                    <IconButton label="Suspend owner" icon={ShieldAlert} danger onClick={() => onUpdateOwner(owner.id, { status: owner.status === "suspended" ? "active" : "suspended" })} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BookingManagement({ bookings, houses, settings }) {
  const suspicious = houses.filter((house) => (
    !house.owner_id ||
    (settings.requireMapPin && (!house.latitude || !house.longitude)) ||
    house.displayStatus === "pending" ||
    (settings.requireOwnerIdentity && house.owner_identity_verified === false)
  ));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h3 className="text-xl font-black">Booking Monitor</h3>
          <p className="mt-1 text-sm text-slate-500">Track demand, approvals, rentals, and open requests.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-black uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-4">Booking</th>
                <th className="px-4 py-4">Finder</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookings.length === 0 ? (
                <tr><td colSpan="4" className="px-4 py-12"><EmptyState title="No bookings yet" body="Booking activity will appear here." /></td></tr>
              ) : bookings.map((booking) => (
                <tr id={`admin-booking-${booking.id}`} key={booking.id} className="scroll-mt-28">
                  <td className="px-4 py-4 font-black">{booking.house_title}</td>
                  <td className="px-4 py-4">
                    <p className="font-bold">{booking.finder_name || "Finder"}</p>
                    <p className="text-slate-500">{booking.finder_phone || booking.finder_email || "No contact"}</p>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={booking.status} /></td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(booking.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="rounded-lg border border-red-100 bg-white p-5 shadow-sm dark:border-red-900 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-black text-red-700"><AlertTriangle size={18} /> Suspicious listing signals</h3>
        <div className="mt-4 space-y-3">
          {suspicious.length === 0 ? <EmptyState title="No risks detected" body="All listings have the expected verification signals." /> : suspicious.slice(0, 6).map((house) => (
            <div key={house.id} className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-bold">{house.title}</p>
              <p>{!house.owner_id ? "Missing owner link. " : ""}{!house.latitude || !house.longitude ? "No pinned map. " : ""}{house.displayStatus === "pending" ? "Pending review." : ""}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportsPanel({ stats, houses, activity }) {
  const verified = houses.filter((house) => house.displayStatus === "verified").length;
  const percent = houses.length ? Math.round((verified / houses.length) * 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-xl font-black">Verification analytics</h3>
        <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">{percent}% of properties are verified.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.slice(0, 6).map((item) => <StatsCard key={item.label} item={item} />)}
        </div>
      </section>
      <RecentActionsPanel activity={activity} houses={houses} />
    </div>
  );
}

function SettingsPanel({ admin, settings, stats, onApplyDefaults, onExport, onReset, onToggleDark, onUpdateSetting }) {
  const settingGroups = [
    {
      title: "Dashboard preferences",
      description: "Choose how the admin workspace opens and refreshes.",
      controls: (
        <>
          <SettingToggle
            title="Dark mode"
            body="Use the darker control-room interface."
            checked={settings.darkMode}
            onChange={onToggleDark}
          />
          <SettingToggle
            title="Auto refresh"
            body="Reload dashboard data automatically while this page is open."
            checked={settings.autoRefresh}
            onChange={(checked) => onUpdateSetting("autoRefresh", checked)}
          />
          <SettingSelect
            label="Refresh interval"
            value={settings.refreshInterval}
            onChange={(value) => onUpdateSetting("refreshInterval", value)}
            options={[
              ["30", "Every 30 seconds"],
              ["60", "Every minute"],
              ["300", "Every 5 minutes"]
            ]}
          />
          <SettingSelect
            label="Opening view"
            value={settings.defaultView}
            onChange={(value) => onUpdateSetting("defaultView", value)}
            options={navItems.map((item) => [item.id, item.label])}
          />
          <SettingSelect
            label="Default property filter"
            value={settings.defaultStatusFilter}
            onChange={(value) => onUpdateSetting("defaultStatusFilter", value)}
            options={statusOptions.map((status) => [status, status])}
          />
          <SettingSelect
            label="Default sorting"
            value={settings.defaultSortBy}
            onChange={(value) => onUpdateSetting("defaultSortBy", value)}
            options={[
              ["newest", "Newest first"],
              ["status", "Status"],
              ["price", "Highest price"]
            ]}
          />
          <SettingToggle
            title="Compact property table"
            body="Use tighter rows when reviewing many listings."
            checked={settings.compactTables}
            onChange={(checked) => onUpdateSetting("compactTables", checked)}
          />
        </>
      )
    },
    {
      title: "Alerts",
      description: "Control what appears in the admin notification bell.",
      controls: (
        <>
          <SettingToggle
            title="Property alerts"
            body="Notify about pending, rejected, and suspended listings."
            checked={settings.propertyAlerts}
            onChange={(checked) => onUpdateSetting("propertyAlerts", checked)}
          />
          <SettingToggle
            title="Booking alerts"
            body="Notify about new and updated booking requests."
            checked={settings.bookingAlerts}
            onChange={(checked) => onUpdateSetting("bookingAlerts", checked)}
          />
          <SettingToggle
            title="Owner alerts"
            body="Notify about identity checks and suspended owners."
            checked={settings.ownerAlerts}
            onChange={(checked) => onUpdateSetting("ownerAlerts", checked)}
          />
          <SettingToggle
            title="Browser notifications"
            body="Keep this preference ready for browser-level notifications."
            checked={settings.browserNotifications}
            onChange={(checked) => onUpdateSetting("browserNotifications", checked)}
          />
        </>
      )
    },
    {
      title: "Moderation workflow",
      description: "Set the review posture for property verification.",
      controls: (
        <>
          <SettingSelect
            label="Moderation mode"
            value={settings.moderationMode}
            onChange={(value) => onUpdateSetting("moderationMode", value)}
            options={[
              ["manual", "Manual review"],
              ["guided", "Guided checklist"],
              ["strict", "Strict verification"]
            ]}
          />
          <SettingToggle
            title="Require map pin"
            body="Treat missing property coordinates as a risk signal."
            checked={settings.requireMapPin}
            onChange={(checked) => onUpdateSetting("requireMapPin", checked)}
          />
          <SettingToggle
            title="Require verified owner"
            body="Prioritize listings from owners who completed identity checks."
            checked={settings.requireOwnerIdentity}
            onChange={(checked) => onUpdateSetting("requireOwnerIdentity", checked)}
          />
        </>
      )
    },
    {
      title: "Export and session",
      description: "Choose download defaults and admin session preference.",
      controls: (
        <>
          <SettingSelect
            label="Export format"
            value={settings.exportFormat}
            onChange={(value) => onUpdateSetting("exportFormat", value)}
            options={[
              ["csv", "CSV"],
              ["json", "JSON"]
            ]}
          />
          <SettingToggle
            title="Include image fields"
            body="Keep image URLs and image arrays in exported records."
            checked={settings.includeImages}
            onChange={(checked) => onUpdateSetting("includeImages", checked)}
          />
          <SettingSelect
            label="Session timeout"
            value={settings.sessionTimeout}
            onChange={(value) => onUpdateSetting("sessionTimeout", value)}
            options={[
              ["15", "15 minutes"],
              ["30", "30 minutes"],
              ["60", "1 hour"],
              ["120", "2 hours"]
            ]}
          />
        </>
      )
    }
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-5">
        {settingGroups.map((group) => (
          <div key={group.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                {group.title === "Alerts" ? <Bell size={18} /> : group.title === "Dashboard preferences" ? <Settings size={18} /> : group.title === "Moderation workflow" ? <ShieldCheck size={18} /> : <Download size={18} />}
              </span>
              <div>
                <h3 className="text-lg font-black">{group.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{group.description}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.controls}
            </div>
          </div>
        ))}
      </section>

      <aside className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-black">Admin profile</h3>
          <div className="mt-4 rounded-md bg-slate-50 p-4 dark:bg-slate-800">
            <p className="font-black">{admin?.name || "Admin"}</p>
            <p className="mt-1 text-sm text-slate-500">{admin?.email || "No email loaded"}</p>
            <p className="mt-2 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-black capitalize text-blue-700">{admin?.role || "platform admin"}</p>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-lg font-black">Current defaults</h3>
          <div className="mt-4 space-y-3 text-sm">
            <SettingsSummary label="Opening view" value={navItems.find((item) => item.id === settings.defaultView)?.label || "Dashboard"} />
            <SettingsSummary label="Property filter" value={settings.defaultStatusFilter} />
            <SettingsSummary label="Sort order" value={settings.defaultSortBy} />
            <SettingsSummary label="Export" value={settings.exportFormat.toUpperCase()} />
          </div>
          <div className="mt-5 grid gap-2">
            <button onClick={onApplyDefaults} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
              <Save size={16} />
              Apply defaults
            </button>
            <button onClick={onExport} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <Download size={16} />
              Download data
            </button>
            <button onClick={onReset} className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50">
              <RotateCcw size={16} />
              Reset settings
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-lg font-black"><RefreshCw size={18} /> Dashboard health</h3>
          <div className="mt-4 grid gap-3">
            {stats.slice(0, 4).map((item) => (
              <SettingsSummary key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function SettingToggle({ title, body, checked, onChange }) {
  return (
    <label className="flex min-h-28 items-start justify-between gap-4 rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <span>
        <span className="block font-black">{title}</span>
        <span className="mt-1 block text-sm text-slate-500">{body}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 accent-blue-600"
      />
    </label>
  );
}

function SettingSelect({ label, value, onChange, options }) {
  return (
    <label className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <span className="block text-sm font-black">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function SettingsSummary({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className="font-black capitalize">{value}</span>
    </div>
  );
}

function toCsv(rows) {
  if (!rows.length) {
    return "No records";
  }

  const columns = Array.from(rows.reduce((keys, row) => {
    Object.keys(row).forEach((key) => {
      if (!Array.isArray(row[key]) && typeof row[key] !== "object") {
        keys.add(key);
      }
    });

    return keys;
  }, new Set()));

  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  return [
    columns.map(escapeCell).join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(","))
  ].join("\n");
}

function PropertyModal({ property, note, onNote, onClose, onApprove, onReject, onSuspend }) {
  const gallery = Array.from(new Set([...(property.images || []), property.image].map(getImageValue).filter(Boolean)));
  const hero = gallery[0] || getImageSrc(property);
  const hasMap = property.latitude && property.longitude;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black">{property.title}</h3>
            <p className="text-sm text-slate-500">{property.location}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20} /></button>
        </div>
        <div className="grid max-h-[calc(92vh-80px)] gap-6 overflow-y-auto p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <img src={hero} alt={property.title} className="h-80 w-full rounded-lg object-cover" />
            {gallery.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {gallery.slice(0, 8).map((image) => <img key={image} src={image} alt="" className="h-20 rounded-md object-cover" />)}
              </div>
            )}
            <div className="mt-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="font-black">Map location</h4>
              <div className="mt-3 overflow-hidden rounded-md bg-slate-100">
                {hasMap ? (
                  <iframe title={`${property.title} map`} src={`https://www.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`} className="h-72 w-full" loading="lazy" />
                ) : (
                  <div className="flex h-72 items-center justify-center text-slate-500">No pinned location provided.</div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <StatusBadge status={property.displayStatus} />
                <VerificationBadge status={property.displayStatus} />
              </div>
              <DetailGrid property={property} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="font-black">Owner information</h4>
              <p className="mt-3 font-bold">{property.owner_name || "Owner pending"}</p>
              <p className="text-sm text-slate-500">{property.owner_phone || "No phone"} | {property.owner_email || "No email"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="font-black">Verification history</h4>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>Submitted for review: {formatDate(property.submittedAt) || "Recently"}</p>
                <p>Current status: {property.displayStatus}</p>
                <p>Map check: {hasMap ? "Pinned coordinates present" : "Missing coordinates"}</p>
              </div>
              <textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder="Add verification notes or rejection comments..." className="mt-4 min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button onClick={onApprove} className="rounded-md bg-emerald-600 px-4 py-3 font-black text-white hover:bg-emerald-700">Approve</button>
              <button onClick={onReject} className="rounded-md border border-red-200 px-4 py-3 font-black text-red-600 hover:bg-red-50">Reject</button>
              <button onClick={onSuspend} className="rounded-md border border-amber-200 px-4 py-3 font-black text-amber-700 hover:bg-amber-50">Suspend</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailGrid({ property }) {
  const rows = [
    ["Price", `Ksh ${property.price || 0}`],
    ["Rooms", `${property.beds || 0} beds / ${property.baths || 0} baths`],
    ["Category", property.house_category || "Residential"],
    ["Unit", property.unit_number || "Not set"],
    ["Floor", property.floor_number || "Not set"],
    ["Description", property.description || property.apartment_name || "No description added"]
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
          <p className="mt-1 font-bold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ config, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="text-xl font-black">{config.title}</h3>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{config.body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-md border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={config.action} className={`rounded-md px-4 py-2 font-bold text-white ${config.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>Confirm</button>
        </div>
      </section>
    </div>
  );
}

function Toast({ toast, onClose }) {
  const success = toast.type === "success";

  return (
    <div className={`fixed right-4 top-24 z-[70] flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
      {success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <p className="text-sm font-bold">{toast.message}</p>
      <button onClick={onClose} className="ml-auto"><X size={16} /></button>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={16} /></button>
        <button disabled={page === totalPages} onClick={() => onPage(page + 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-40 dark:border-slate-700"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-lg bg-white dark:bg-slate-900" />)}
      </div>
      <div className="flex h-72 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Loading dashboard...
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="text-center">
      <MoreHorizontal className="mx-auto text-slate-400" size={26} />
      <p className="mt-2 font-black text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getImageValue(image) {
  if (typeof image === "string") {
    return image;
  }

  return image?.url || image?.src || image?.data_url || "";
}

function getImageSrc(house) {
  return getImageValue(house.image) || getImageValue(house.images?.[0]) || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80";
}

export default AdminDashboard;
