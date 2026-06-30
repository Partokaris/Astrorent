import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LogIn, Search } from "lucide-react";

const API_URL = "http://127.0.0.1:5000";

function AccountLogin({ initialRole = "home_finder" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = new URLSearchParams(location.search).get("next");
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = role === "home_owner";

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isOwner ? "/api/owners/login" : "/api/users/login";
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (isOwner) {
        localStorage.setItem("owner_token", data.token);
        localStorage.setItem("owner_name", data.user.name);
        localStorage.setItem("owner_account_type", data.user.account_type);
        navigate("/owner/dashboard");
      } else {
        localStorage.setItem("finder_token", data.token);
        localStorage.setItem("finder_name", data.user.name);
        localStorage.setItem("finder_account_type", data.user.account_type);
        navigate(nextPath || "/finder/homes");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-blue-600">
            <ArrowLeft size={18} />
            Back home
          </Link>
          <span className="text-xl font-bold text-blue-600">AstroRent</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-12 lg:grid-cols-[1fr_420px]">
        <section className="pt-6">
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg ${isOwner ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-600"}`}>
            {isOwner ? <Home size={28} /> : <Search size={28} />}
          </div>
          <p className={`text-sm font-bold uppercase tracking-wide ${isOwner ? "text-emerald-700" : "text-blue-600"}`}>
            Account login
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {isOwner ? "Control your apartments" : "Browse available homes"}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            {isOwner
              ? "Choose home owner, then log in to upload houses, manage occupancy, save customer details, and track income."
              : "Choose home finder, then log in to browse available homes and continue your rental search."}
          </p>
          <p className="mt-6 text-slate-600">
            New to AstroRent?{" "}
            <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">Login</h2>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setRole("home_finder")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${!isOwner ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Search size={16} />
              Home Finder
            </button>
            <button
              type="button"
              onClick={() => setRole("home_owner")}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${isOwner ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <Home size={16} />
              Home Owner
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} />

          <button
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <LogIn size={18} />
            {loading ? "Logging in..." : `Login as ${isOwner ? "home owner" : "home finder"}`}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, name, type, value, onChange }) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        name={name}
        value={value}
        required
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
      />
    </label>
  );
}

export default AccountLogin;
