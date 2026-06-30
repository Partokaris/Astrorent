import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LogIn } from "lucide-react";

const API_URL = "http://127.0.0.1:5000";

function HomeOwnerLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      const response = await fetch(`${API_URL}/api/owners/login`, {
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

      localStorage.setItem("owner_token", data.token);
      localStorage.setItem("owner_name", data.user.name);
      localStorage.setItem("owner_account_type", data.user.account_type);
      navigate("/owner/dashboard");
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
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Home size={28} />
          </div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
            Home owner login
          </p>
          <h1 className="mt-2 text-4xl font-bold">Control your apartments</h1>
          <p className="mt-4 text-lg text-slate-600">
            Log in to upload houses, pin their locations, manage occupancy, save customer details, and track rent income.
          </p>
          <p className="mt-6 text-slate-600">
            New owner?{" "}
            <Link to="/signup/home-owner" className="font-semibold text-blue-600 hover:text-blue-700">
              Create a home owner account
            </Link>
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">Owner Login</h2>

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
            {loading ? "Logging in..." : "Login as home owner"}
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

export default HomeOwnerLogin;
