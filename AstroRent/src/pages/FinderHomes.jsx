import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bath, Bed, Bell, CalendarCheck, EyeOff, LogOut, MapPin, MessageSquare, RotateCcw, Search } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import VerificationBadge from "../components/VerificationBadge";

const API_URL = "http://127.0.0.1:5000";

function FinderHomes() {
  const navigate = useNavigate();
  const finderName = localStorage.getItem("finder_name") || "Home finder";
  const [houses, setHouses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [hiddenRequests, setHiddenRequests] = useState(() => (
    JSON.parse(localStorage.getItem("finder_hidden_requests") || "[]")
  ));
  const [showHiddenRequests, setShowHiddenRequests] = useState(false);
  const [activeTab, setActiveTab] = useState("homes");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("finder_token");

    Promise.all([
      fetch(`${API_URL}/api/houses`).then((response) => response.json()),
      fetch(`${API_URL}/api/finder/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then((response) => response.ok ? response.json() : []),
      fetch(`${API_URL}/api/finder/announcements`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then((response) => response.ok ? response.json() : [])
    ])
      .then(([houseData, bookingData, announcementData]) => {
        setHouses(houseData);
        setBookings(bookingData);
        setAnnouncements(announcementData);
      })
      .catch(() => setError("Could not load available homes"))
      .finally(() => setLoading(false));
  }, []);

  const filteredHouses = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return houses.filter((house) => {
      const haystack = `${house.title} ${house.location} ${house.price}`.toLowerCase();

      return haystack.includes(query);
    });
  }, [houses, searchTerm]);

  const finderNotifications = useMemo(() => {
    const bookingUpdates = bookings.flatMap((booking) => {
      const updates = [];

      if (["approved", "declined", "rented"].includes(booking.status)) {
        updates.push({
          id: `finder-booking-${booking.id}-${booking.status}`,
          title: booking.status === "approved" ? "Booking approved" : `Booking ${booking.status}`,
          body: `${booking.house_title || "Your selected home"} was marked ${booking.status}.`,
          time: booking.created_at || `booking-${booking.id}`,
          targetTab: booking.status === "rented" ? "tenant" : "requests",
          targetId: `finder-booking-${booking.id}`
        });
      }

      if (booking.rent_overdue_notice) {
        updates.push({
          id: `finder-booking-${booking.id}-rent-overdue-${booking.rent_overdue_notice}`,
          title: "Rent overdue notice",
          body: booking.rent_overdue_notice,
          time: booking.created_at || `booking-${booking.id}-rent-overdue`,
          targetTab: "tenant",
          targetId: `finder-tenant-booking-${booking.id}`
        });
      }

      return updates;
    });

    const ownerAnnouncements = announcements.map((announcement) => ({
      id: `finder-announcement-${announcement.id}`,
      title: announcement.title || "Owner announcement",
      body: announcement.message || "Your home owner posted a new update.",
      time: announcement.created_at || `announcement-${announcement.id}`,
      targetTab: "tenant",
      targetId: `finder-announcement-${announcement.id}`
    }));

    return [...bookingUpdates, ...ownerAnnouncements].slice(0, 12);
  }, [announcements, bookings]);

  const openNotificationTarget = (notification) => {
    setActiveTab(notification.targetTab || "requests");

    if (notification.targetTab === "requests") {
      setShowHiddenRequests(hiddenRequests.includes(Number(notification.targetId?.replace("finder-booking-", ""))));
    }

    window.setTimeout(() => {
      document.getElementById(notification.targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 80);
  };

  const handleLogout = () => {
    localStorage.removeItem("finder_token");
    localStorage.removeItem("finder_name");
    localStorage.removeItem("finder_account_type");
    navigate("/login/home-finder");
  };

  const sendBookingRequest = async (bookingId, type, message) => {
    const token = localStorage.getItem("finder_token");

    try {
      const response = await fetch(`${API_URL}/api/finder/bookings/${bookingId}/request`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, message })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      setBookings((current) => current.map((booking) => (
        booking.id === bookingId ? data.booking : booking
      )));
    } catch (err) {
      setError(err.message);
    }
  };

  const hideRequest = (bookingId) => {
    setHiddenRequests((current) => {
      const next = Array.from(new Set([...current, bookingId]));
      localStorage.setItem("finder_hidden_requests", JSON.stringify(next));
      return next;
    });
  };

  const restoreRequest = (bookingId) => {
    setHiddenRequests((current) => {
      const next = current.filter((id) => id !== bookingId);
      localStorage.setItem("finder_hidden_requests", JSON.stringify(next));
      return next;
    });
  };

  const payRent = async (bookingId, payment) => {
    const token = localStorage.getItem("finder_token");
    setPaymentNotice("");

    try {
      const response = await fetch(`${API_URL}/api/finder/bookings/${bookingId}/pay-rent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payment)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment failed");
      }

      setBookings((current) => current.map((booking) => (
        booking.id === bookingId ? data.booking : booking
      )));
      setPaymentNotice("Payment recorded successfully. Keep your reference code safe and do not submit the same payment again.");
    } catch (err) {
      setPaymentNotice(err.message);
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
            <p className="text-sm text-slate-500">Welcome, {finderName}</p>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell
              notifications={finderNotifications}
              storageKey="finder_read_notifications"
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
        <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              Home finder
            </p>
            <h1 className="mt-2 text-3xl font-bold">Available homes</h1>
            <p className="mt-2 text-slate-600">
              Browse active rental homes currently listed on AstroRent.
            </p>
          </div>

          <div className="relative w-full md:max-w-sm">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by location, title, price"
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 outline-none focus:border-blue-600"
            />
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 flex gap-2 border-b">
          <TabButton active={activeTab === "homes"} onClick={() => setActiveTab("homes")} icon={Search}>
            Homes
          </TabButton>
          <TabButton active={activeTab === "requests"} onClick={() => setActiveTab("requests")} icon={Bell}>
            My requests
          </TabButton>
          <TabButton active={activeTab === "tenant"} onClick={() => setActiveTab("tenant")} icon={MessageSquare}>
            Tenant
          </TabButton>
        </div>

        {activeTab === "tenant" ? (
          <TenantDashboard
            bookings={bookings.filter((booking) => booking.status === "rented")}
            announcements={announcements}
            paymentNotice={paymentNotice}
            loading={loading}
            onPayRent={payRent}
          />
        ) : activeTab === "requests" ? (
          <FinderBookings
            bookings={bookings}
            hiddenRequests={hiddenRequests}
            showHiddenRequests={showHiddenRequests}
            loading={loading}
            onHideRequest={hideRequest}
            onRestoreRequest={restoreRequest}
            onSendRequest={sendBookingRequest}
            onToggleHidden={() => setShowHiddenRequests((current) => !current)}
          />
        ) : loading ? (
          <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">
            Loading available homes...
          </div>
        ) : filteredHouses.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">
            No available homes match your search.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredHouses.map((house) => (
              <article
                key={house.id}
                className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
              >
                <img
                  src={house.image}
                  alt={house.title}
                  className="h-56 w-full object-cover"
                />

                <div className="p-5">
                  <h2 className="text-xl font-bold">{house.title}</h2>

                  <div className="mt-2">
                    <VerificationBadge status={house.status} compact />
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-slate-500">
                    <MapPin size={16} />
                    <span>{house.location}</span>
                  </div>

                  <p className="mt-4 text-xl font-bold text-blue-600">
                    Ksh {house.price}
                  </p>

                  <div className="mt-4 flex gap-5 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Bed size={16} />
                      {house.beds} beds
                    </div>

                    <div className="flex items-center gap-1">
                      <Bath size={16} />
                      {house.baths} baths
                    </div>
                  </div>

                  <Link
                    to={`/houses/${house.id}`}
                    className="mt-5 block w-full rounded-md bg-blue-600 py-2 text-center font-semibold text-white hover:bg-blue-700"
                  >
                    View details
                  </Link>
                </div>
              </article>
            ))}
          </div>
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

function FinderBookings({
  bookings,
  hiddenRequests,
  showHiddenRequests,
  loading,
  onHideRequest,
  onRestoreRequest,
  onSendRequest,
  onToggleHidden
}) {
  const [drafts, setDrafts] = useState({});

  const updateDraft = (bookingId, type, value) => {
    setDrafts((current) => ({
      ...current,
      [`${bookingId}-${type}`]: value
    }));
  };

  const getDraft = (bookingId, type) => drafts[`${bookingId}-${type}`] || "";

  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading your requests...</div>;
  }

  const visibleBookings = showHiddenRequests
    ? bookings.filter((booking) => hiddenRequests.includes(booking.id))
    : bookings.filter((booking) => !hiddenRequests.includes(booking.id));
  const hiddenCount = hiddenRequests.length;

  if (bookings.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">No booking requests yet.</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {showHiddenRequests ? "Showing hidden requests" : "Showing active requests"}
        </p>
        <button
          type="button"
          onClick={onToggleHidden}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
        >
          {showHiddenRequests ? <RotateCcw size={16} /> : <EyeOff size={16} />}
          {showHiddenRequests ? "Show active" : `Show hidden (${hiddenCount})`}
        </button>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">
          {showHiddenRequests ? "No hidden requests." : "No visible requests. Hidden requests can be shown above."}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
      {visibleBookings.map((booking) => (
        <article id={`finder-booking-${booking.id}`} key={booking.id} className="rounded-lg border bg-white p-5 shadow-sm scroll-mt-28">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{booking.house_title}</h2>
              <p className="mt-1 text-sm text-slate-500">Status: {booking.status}</p>
            </div>
            <div className="flex items-center gap-2">
              <Bell size={18} className={booking.status === "approved" ? "text-emerald-600" : "text-slate-400"} />
              {showHiddenRequests ? (
                <button
                  type="button"
                  onClick={() => onRestoreRequest(booking.id)}
                  className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
                  title="Restore request"
                  aria-label="Restore request"
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onHideRequest(booking.id)}
                  className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
                  title="Hide request"
                  aria-label="Hide request"
                >
                  <EyeOff size={16} />
                </button>
              )}
            </div>
          </div>

          {booking.status === "approved" && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Your booking was approved. Request a place visit and inspect the house before paying to avoid scams.
            </div>
          )}

          {booking.status === "rented" && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              This house is marked as rented to you. You can now message the owner for assistance or send a vacate request.
            </div>
          )}

          <RequestBox
            icon={CalendarCheck}
            title="Request place visit"
            disabled={booking.status !== "approved"}
            value={getDraft(booking.id, "visit")}
            placeholder="Suggest date/time for a visit..."
            onChange={(value) => updateDraft(booking.id, "visit", value)}
            onSubmit={() => onSendRequest(booking.id, "visit", getDraft(booking.id, "visit"))}
          />

          <RequestBox
            icon={MessageSquare}
            title="Report house condition"
            disabled={booking.status !== "rented"}
            value={getDraft(booking.id, "condition")}
            placeholder="Describe repair or assistance needed..."
            onChange={(value) => updateDraft(booking.id, "condition", value)}
            onSubmit={() => onSendRequest(booking.id, "condition", getDraft(booking.id, "condition"))}
          />

          <RequestBox
            icon={MapPin}
            title="Request to vacate"
            disabled={booking.status !== "rented"}
            value={getDraft(booking.id, "vacate")}
            placeholder="Tell owner your vacate date and reason..."
            onChange={(value) => updateDraft(booking.id, "vacate", value)}
            onSubmit={() => onSendRequest(booking.id, "vacate", getDraft(booking.id, "vacate"))}
          />
        </article>
      ))}
        </div>
      )}
    </div>
  );
}

function TenantDashboard({ bookings, announcements, paymentNotice, loading, onPayRent }) {
  const [payments, setPayments] = useState({});

  const updatePayment = (bookingId, field, value) => {
    setPayments((current) => ({
      ...current,
      [bookingId]: {
        ...(current[bookingId] || {}),
        [field]: value
      }
    }));
  };

  if (loading) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Loading tenant dashboard...</div>;
  }

  if (bookings.length === 0) {
    return <div className="rounded-lg border bg-white p-8 text-slate-500 shadow-sm">Tenant dashboard opens after a house is marked as rented to you.</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        {bookings.map((booking) => {
          const payment = payments[booking.id] || {};

          return (
            <article id={`finder-tenant-booking-${booking.id}`} key={booking.id} className="rounded-lg border bg-white p-5 shadow-sm scroll-mt-28">
              <h2 className="text-xl font-bold">{booking.house_title}</h2>
              <p className="mt-1 text-sm text-slate-500">Tenant account active</p>

              {booking.rent_overdue_notice && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Rent overdue notice</p>
                  <p className="mt-1">{booking.rent_overdue_notice}</p>
                </div>
              )}

              <div className="mt-4 rounded-md border border-slate-200 p-4">
                <h3 className="font-semibold">Pay rent</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    value={payment.amount || ""}
                    type="number"
                    onChange={(event) => updatePayment(booking.id, "amount", event.target.value)}
                    placeholder="Amount"
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  />
                  <input
                    value={payment.paid_for || ""}
                    onChange={(event) => updatePayment(booking.id, "paid_for", event.target.value)}
                    placeholder="Paid for, e.g. May rent"
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  />
                  <input
                    value={payment.paid_on || ""}
                    type="date"
                    onChange={(event) => updatePayment(booking.id, "paid_on", event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  />
                  <input
                    value={payment.payment_reference || ""}
                    onChange={(event) => updatePayment(booking.id, "payment_reference", event.target.value)}
                    placeholder="Unique payment reference"
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                  />
                </div>
                <input
                  value={payment.notes || ""}
                  onChange={(event) => updatePayment(booking.id, "notes", event.target.value)}
                  placeholder="Optional notes"
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                />
                {paymentNotice && (
                  <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${paymentNotice.includes("successfully") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {paymentNotice}
                  </div>
                )}
                <button
                  type="button"
                  disabled={!payment.amount || !payment.payment_reference}
                  onClick={() => onPayRent(booking.id, payment)}
                  className="mt-3 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Submit rent payment
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <aside className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Announcements</h2>
        {announcements.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No announcements from your home owner yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {announcements.map((announcement) => (
              <div id={`finder-announcement-${announcement.id}`} key={announcement.id} className="rounded-md bg-slate-50 p-3 text-sm scroll-mt-28">
                <p className="font-semibold">{announcement.title}</p>
                <p className="mt-1 text-slate-600">{announcement.message}</p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

function RequestBox({ icon: Icon, title, value, placeholder, disabled = false, onChange, onSubmit }) {
  return (
    <div className="mt-4 rounded-md border border-slate-200 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon size={16} />
        {title}
      </p>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={onSubmit}
        className="mt-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        Send
      </button>
    </div>
  );
}

export default FinderHomes;
