import { Link } from "react-router-dom";
import { ArrowLeft, Home, Search } from "lucide-react";

function SignupChoice() {
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

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Create account
          </p>
          <h1 className="mt-2 text-4xl font-bold">How will you use AstroRent?</h1>
          <p className="mt-4 text-lg text-slate-600">
            Choose the account type that matches what you want to do on the platform.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/signup/home-finder"
            className="rounded-lg border bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Search size={24} />
            </div>
            <h2 className="text-2xl font-bold">I am a home finder</h2>
            <p className="mt-3 text-slate-600">
              Search rentals, save preferences, and connect with property owners.
            </p>
          </Link>

          <Link
            to="/signup/home-owner"
            className="rounded-lg border bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Home size={24} />
            </div>
            <h2 className="text-2xl font-bold">I am a home owner</h2>
            <p className="mt-3 text-slate-600">
              Prepare your owner profile and start listing homes for tenants.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default SignupChoice;
