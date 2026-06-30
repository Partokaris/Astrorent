import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Home, Search } from "lucide-react";

const API_URL = "http://127.0.0.1:5000";

function ClientSignup({ accountType }) {
  const navigate = useNavigate();
  const isOwner = accountType === "home_owner";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    preferred_location: "",
    budget: "",
    property_location: "",
    property_type: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/users/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          account_type: accountType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      setMessage("Account created successfully.");
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        preferred_location: "",
        budget: "",
        property_location: "",
        property_type: ""
      });

      window.setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/signup" className="inline-flex items-center gap-2 font-semibold text-slate-600 hover:text-blue-600">
            <ArrowLeft size={18} />
            Choose account type
          </Link>
          <span className="text-xl font-bold text-blue-600">AstroRent</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[1fr_420px]">
        <section className="pt-4">
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-lg ${isOwner ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-600"}`}>
            {isOwner ? <Home size={28} /> : <Search size={28} />}
          </div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            {isOwner ? "Home owner signup" : "Home finder signup"}
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {isOwner ? "Create your owner account" : "Create your finder account"}
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            {isOwner
              ? "Set up an owner profile so AstroRent can connect your property with the right tenants."
              : "Tell AstroRent what kind of home you are looking for so your search starts with useful preferences."}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
          {(message || error) && (
            <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {error || message}
            </div>
          )}

          <Field label="Full name" name="name" value={form.name} onChange={handleChange} />
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <Field label="Phone number" name="phone" value={form.phone} onChange={handleChange} />
          <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} />

          {isOwner ? (
            <>
              <Field label="Property location" name="property_location" value={form.property_location} onChange={handleChange} />
              <Field label="Property type" name="property_type" value={form.property_type} onChange={handleChange} placeholder="Apartment, bedsitter, townhouse..." />
            </>
          ) : (
            <>
              <Field label="Preferred location" name="preferred_location" value={form.preferred_location} onChange={handleChange} />
              <Field label="Monthly budget" name="budget" value={form.budget} onChange={handleChange} placeholder="Example: 25,000 - 40,000" />
            </>
          )}

          <button
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <CheckCircle2 size={18} />
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange, placeholder = "" }) {
  return (
    <label className="mb-4 block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        required
        placeholder={placeholder}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
      />
    </label>
  );
}

export default ClientSignup;
