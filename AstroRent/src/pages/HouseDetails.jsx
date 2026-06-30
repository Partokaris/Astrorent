import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bath,
  Bed,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import VerificationBadge from "../components/VerificationBadge";

const API_URL = "http://127.0.0.1:5000";

function HouseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [selectedImage, setSelectedImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token = localStorage.getItem("finder_token");
  const isAuthenticated = Boolean(token && localStorage.getItem("finder_account_type") === "home_finder");

  useEffect(() => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_URL}/api/houses/${id}`, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load house");
        }

        return res.json();
      })
      .then((data) => {
        setHouse(data);
        setSelectedImage(getImageSrc((data.images && data.images[0]) || data.image));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  const gallery = useMemo(() => {
    if (!house) {
      return [];
    }

    return Array.from(new Set([...(house.images || []), house.image].map(getImageSrc).filter(Boolean)));
  }, [house]);

  const hasPinnedLocation = Boolean(house?.latitude && house?.longitude);
  const mapUrl = hasPinnedLocation
    ? `https://www.google.com/maps?q=${house.latitude},${house.longitude}&z=15&output=embed`
    : "";

  const signInPath = `/login/home-finder?next=${encodeURIComponent(`/houses/${id}`)}`;
  const signUpPath = "/signup/home-finder";

  const handleBook = async () => {
    setNotice("");

    if (!isAuthenticated) {
      navigate(signInPath);
      return;
    }

    setBooking(true);

    try {
      const response = await fetch(`${API_URL}/api/houses/${id}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: "I want to book or contact the owner about this home" })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Booking failed");
      }

      setNotice(data.message || "Booking request received");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading home details...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 p-8 text-red-600">{error}</div>;
  }

  if (!house) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-600">House not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-xl font-bold text-blue-600">
            AstroRent
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div>
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              {selectedImage ? (
                <img src={selectedImage} alt={house.title} className="h-[420px] w-full object-cover" />
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-slate-100 text-slate-500">
                  No photo uploaded
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {gallery.slice(0, 10).map((image) => (
                  <button
                    key={image}
                    onClick={() => setSelectedImage(image)}
                    className={`overflow-hidden rounded-md border bg-white ${
                      selectedImage === image ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200"
                    }`}
                    aria-label="Show house photo"
                  >
                    <img src={image} alt="" className="h-20 w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <section className="mt-8 rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Home details</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold">{house.title}</h1>
                    <VerificationBadge status={house.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-slate-600">
                    <MapPin size={18} />
                    <span>{house.location || "Location not added"}</span>
                  </div>
                </div>

                <div className="rounded-md bg-blue-50 px-4 py-3 text-right">
                  <p className="text-sm text-slate-500">Monthly rent</p>
                  <p className="text-2xl font-bold text-blue-600">Ksh {house.price}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <InfoTile icon={<Bed size={18} />} label="Bedrooms" value={house.beds || 0} />
                <InfoTile icon={<Bath size={18} />} label="Bathrooms" value={house.baths || 0} />
                <InfoTile
                  icon={<CheckCircle2 size={18} />}
                  label="Status"
                  value={house.status || "active"}
                />
              </div>

              <div className="mt-6 border-t pt-6">
                <h2 className="text-lg font-bold">Location and pinned map</h2>
                <p className="mt-2 text-slate-600">
                  {hasPinnedLocation
                    ? `Pinned at latitude ${house.latitude}, longitude ${house.longitude}.`
                    : "The owner has not added exact map coordinates yet."}
                </p>

                <div className="mt-4 overflow-hidden rounded-lg border bg-slate-100">
                  {hasPinnedLocation ? (
                    <iframe
                      title={`${house.title} map`}
                      src={mapUrl}
                      className="h-80 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="flex h-80 items-center justify-center px-6 text-center text-slate-500">
                      Pinned location will appear here after coordinates are added.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Book this home</h2>
                  <p className="text-sm text-slate-500">Send a booking request to continue.</p>
                </div>
              </div>

              <button
                onClick={handleBook}
                disabled={booking}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                <Send size={18} />
                {booking ? "Sending request..." : "Book / Contact owner"}
              </button>

              {notice && (
                <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {notice}
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                  {isAuthenticated ? <ShieldCheck size={22} /> : <Lock size={22} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Owner or agent contact</h2>
                  <p className="text-sm text-slate-500">
                    {isAuthenticated ? "Full contact details are available." : "Sign in to unlock full details."}
                  </p>
                </div>
              </div>

              {isAuthenticated ? (
                <div className="mt-5 space-y-3 text-slate-700">
                  <ContactRow icon={<Phone size={17} />} label="Phone" value={house.owner_phone || "Not set"} />
                  <ContactRow icon={<Mail size={17} />} label="Email" value={house.owner_email || "Not set"} />
                  <ContactRow label="Name" value={house.owner_name || "Owner / agent"} />
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  You can view photos, status, general location, and pinned map now. Booking and owner contact details
                  are available after signing in or creating a home finder profile.
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link
                      to={signInPath}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                      <Lock size={16} />
                      Login
                    </Link>
                    <Link
                      to={signUpPath}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <UserPlus size={16} />
                      Create profile
                    </Link>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold capitalize text-slate-900">{value}</p>
    </div>
  );
}

function ContactRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

export default HouseDetails;

function getImageSrc(image) {
  if (typeof image === "string") {
    return image;
  }

  return image?.url || image?.src || image?.data_url || "";
}
