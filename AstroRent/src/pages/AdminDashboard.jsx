import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  CheckCircle2,
  Edit3,
  Home,
  LogOut,
  Plus,
  Search,
  Shield,
  Trash2,
  Users
} from "lucide-react";

const API_URL = "http://127.0.0.1:5000";

const emptyHouseForm = {
  title: "",
  location: "",
  price: "",
  image: "",
  beds: "",
  baths: "",
  status: "active"
};

const emptyAdminForm = {
  name: "",
  email: "",
  role: "admin",
  status: "active",
  password: ""
};

function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");

  const [houses, setHouses] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [houseForm, setHouseForm] = useState(emptyHouseForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [houseData, adminData] = await Promise.all([
        request("/api/admin/houses"),
        request("/api/admins")
      ]);

      setHouses(houseData);
      setAdmins(adminData);
    } catch (err) {
      setError(err.message);

      if (err.message.toLowerCase().includes("token")) {
        localStorage.removeItem("admin_token");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, request]);

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const activePosts = houses.filter((house) => house.status === "active").length;
    const suspendedPosts = houses.filter((house) => house.status === "suspended").length;
    const activeAdmins = admins.filter((admin) => admin.status === "active").length;

    return [
      { label: "Total posts", value: houses.length, icon: Home },
      { label: "Active posts", value: activePosts, icon: CheckCircle2 },
      { label: "Suspended", value: suspendedPosts, icon: Ban },
      { label: "Active admins", value: activeAdmins, icon: Users }
    ];
  }, [houses, admins]);

  const filteredHouses = houses.filter((house) => {
    const matchesStatus = statusFilter === "all" || house.status === statusFilter;
    const haystack = `${house.title} ${house.location} ${house.price}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const showSuccess = (text) => {
    setMessage(text);
    setError("");
  };

  const handleHouseSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingHouseId) {
        await request(`/api/houses/${editingHouseId}`, {
          method: "PUT",
          body: JSON.stringify(houseForm)
        });
        showSuccess("Post updated successfully.");
      } else {
        await request("/api/houses", {
          method: "POST",
          body: JSON.stringify(houseForm)
        });
        showSuccess("Post added successfully.");
      }

      setHouseForm(emptyHouseForm);
      setEditingHouseId(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditHouse = (house) => {
    setHouseForm({
      title: house.title,
      location: house.location,
      price: house.price,
      image: house.image,
      beds: house.beds,
      baths: house.baths,
      status: house.status
    });
    setEditingHouseId(house.id);
    setActiveTab("posts");
  };

  const handleHouseStatus = async (house) => {
    const nextStatus = house.status === "active" ? "suspended" : "active";

    try {
      await request(`/api/houses/${house.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      showSuccess(`Post ${nextStatus === "active" ? "restored" : "suspended"}.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHouse = async (houseId) => {
    if (!window.confirm("Delete this post permanently?")) {
      return;
    }

    try {
      await request(`/api/houses/${houseId}`, { method: "DELETE" });
      showSuccess("Post deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingAdminId) {
        const payload = { ...adminForm };

        if (!payload.password) {
          delete payload.password;
        }

        await request(`/api/admins/${editingAdminId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        showSuccess("Admin updated successfully.");
      } else {
        await request("/api/admin/register", {
          method: "POST",
          body: JSON.stringify(adminForm)
        });
        showSuccess("Admin added successfully.");
      }

      setAdminForm(emptyAdminForm);
      setEditingAdminId(null);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditAdmin = (admin) => {
    setAdminForm({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
      password: ""
    });
    setEditingAdminId(admin.id);
    setActiveTab("admins");
  };

  const handleAdminStatus = async (admin) => {
    const nextStatus = admin.status === "active" ? "suspended" : "active";

    try {
      await request(`/api/admins/${admin.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      showSuccess(`Admin ${nextStatus === "active" ? "restored" : "suspended"}.`);
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm("Delete this admin permanently?")) {
      return;
    }

    try {
      await request(`/api/admins/${adminId}`, { method: "DELETE" });
      showSuccess("Admin deleted.");
      await loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              AstroRent
            </p>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-lg border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <Icon size={20} className="text-blue-600" />
                </div>
                <p className="mt-3 text-3xl font-bold">{item.value}</p>
              </div>
            );
          })}
        </section>

        {(message || error) && (
          <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {error || message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-b">
          <button
            onClick={() => setActiveTab("posts")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "posts" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
          >
            <Home size={16} />
            Posts
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "admins" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
          >
            <Shield size={16} />
            Admins
          </button>
        </div>

        {activeTab === "posts" ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
            <form onSubmit={handleHouseSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingHouseId ? "Edit Post" : "Add Post"}
                </h2>
                <Plus size={18} className="text-blue-600" />
              </div>

              <Field label="Title" name="title" value={houseForm.title} onChange={setHouseForm} />
              <Field label="Location" name="location" value={houseForm.location} onChange={setHouseForm} />
              <Field label="Price" name="price" value={houseForm.price} onChange={setHouseForm} />
              <Field label="Image URL" name="image" value={houseForm.image} onChange={setHouseForm} />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Beds" name="beds" type="number" value={houseForm.beds} onChange={setHouseForm} />
                <Field label="Baths" name="baths" type="number" value={houseForm.baths} onChange={setHouseForm} />
              </div>

              <SelectField
                label="Status"
                name="status"
                value={houseForm.status}
                onChange={setHouseForm}
                options={["active", "suspended"]}
              />

              <div className="mt-4 flex gap-3">
                <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                  <CheckCircle2 size={16} />
                  {editingHouseId ? "Save" : "Create"}
                </button>
                {editingHouseId && (
                  <button
                    type="button"
                    onClick={() => {
                      setHouseForm(emptyHouseForm);
                      setEditingHouseId(null);
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="rounded-lg border bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
                <div className="relative max-w-sm flex-1">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search posts"
                    className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 outline-none focus:border-blue-600"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <PostTable
                houses={filteredHouses}
                loading={loading}
                onEdit={handleEditHouse}
                onStatus={handleHouseStatus}
                onDelete={handleDeleteHouse}
              />
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
            <form onSubmit={handleAdminSubmit} className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingAdminId ? "Edit Admin" : "Add Admin"}
                </h2>
                <Shield size={18} className="text-blue-600" />
              </div>

              <Field label="Name" name="name" value={adminForm.name} onChange={setAdminForm} />
              <Field label="Email" name="email" type="email" value={adminForm.email} onChange={setAdminForm} />
              <SelectField
                label="Role"
                name="role"
                value={adminForm.role}
                onChange={setAdminForm}
                options={["admin", "manager", "support"]}
              />
              <SelectField
                label="Status"
                name="status"
                value={adminForm.status}
                onChange={setAdminForm}
                options={["active", "suspended"]}
              />
              <Field
                label={editingAdminId ? "New Password" : "Password"}
                name="password"
                type="password"
                value={adminForm.password}
                onChange={setAdminForm}
                required={!editingAdminId}
              />

              <div className="mt-4 flex gap-3">
                <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                  <CheckCircle2 size={16} />
                  {editingAdminId ? "Save" : "Create"}
                </button>
                {editingAdminId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdminForm(emptyAdminForm);
                      setEditingAdminId(null);
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <AdminTable
              admins={admins}
              loading={loading}
              onEdit={handleEditAdmin}
              onStatus={handleAdminStatus}
              onDelete={handleDeleteAdmin}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange, required = true }) {
  return (
    <label className="mb-3 block text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange((current) => ({
          ...current,
          [name]: event.target.value
        }))}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <label className="mb-3 block text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange((current) => ({
          ...current,
          [name]: event.target.value
        }))}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 capitalize outline-none focus:border-blue-600"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {status}
    </span>
  );
}

function PostTable({ houses, loading, onEdit, onStatus, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Rooms</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan="5">Loading posts...</td>
            </tr>
          ) : houses.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan="5">No posts found.</td>
            </tr>
          ) : houses.map((house) => (
            <tr key={house.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={house.image}
                    alt={house.title}
                    className="h-12 w-16 rounded-md object-cover"
                  />
                  <div>
                    <p className="font-semibold">{house.title}</p>
                    <p className="text-slate-500">{house.location}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold">Ksh {house.price}</td>
              <td className="px-4 py-3 text-slate-600">
                {house.beds} beds / {house.baths} baths
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={house.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <IconButton label="Edit post" onClick={() => onEdit(house)} icon={Edit3} />
                  <IconButton label={house.status === "active" ? "Suspend post" : "Restore post"} onClick={() => onStatus(house)} icon={house.status === "active" ? Ban : CheckCircle2} />
                  <IconButton label="Delete post" onClick={() => onDelete(house.id)} icon={Trash2} danger />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminTable({ admins, loading, onEdit, onStatus, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Admin</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan="4">Loading admins...</td>
            </tr>
          ) : admins.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan="4">No admins found.</td>
            </tr>
          ) : admins.map((admin) => (
            <tr key={admin.id}>
              <td className="px-4 py-3">
                <p className="font-semibold">{admin.name}</p>
                <p className="text-slate-500">{admin.email}</p>
              </td>
              <td className="px-4 py-3 capitalize">{admin.role}</td>
              <td className="px-4 py-3">
                <StatusBadge status={admin.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <IconButton label="Edit admin" onClick={() => onEdit(admin)} icon={Edit3} />
                  <IconButton label={admin.status === "active" ? "Suspend admin" : "Restore admin"} onClick={() => onStatus(admin)} icon={admin.status === "active" ? Ban : CheckCircle2} />
                  <IconButton label="Delete admin" onClick={() => onDelete(admin.id)} icon={Trash2} danger />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

export default AdminDashboard;
