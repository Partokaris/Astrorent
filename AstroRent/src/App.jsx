import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import HouseDetails from "./pages/HouseDetails";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import SignupChoice from "./pages/SignupChoice";
import ClientSignup from "./pages/ClientSignup";
import AccountLogin from "./pages/AccountLogin";
import FinderHomes from "./pages/FinderHomes";
import OwnerDashboard from "./pages/OwnerDashboard";

import ProtectedRoute from "./components/ProtectedRoute";
import FinderProtectedRoute from "./components/FinderProtectedRoute";
import OwnerProtectedRoute from "./components/OwnerProtectedRoute";


function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/houses/:id"
          element={<HouseDetails />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/signup"
          element={<SignupChoice />}
        />

        <Route
          path="/signup/home-finder"
          element={<ClientSignup accountType="home_finder" />}
        />

        <Route
          path="/signup/home-owner"
          element={<ClientSignup accountType="home_owner" />}
        />

        <Route
          path="/login"
          element={<AccountLogin />}
        />

        <Route
          path="/login/home-finder"
          element={<AccountLogin initialRole="home_finder" />}
        />

        <Route
          path="/login/home-owner"
          element={<AccountLogin initialRole="home_owner" />}
        />

        <Route
          path="/finder/homes"
          element={
            <FinderProtectedRoute>
              <FinderHomes />
            </FinderProtectedRoute>
          }
        />

        <Route
          path="/owner/dashboard"
          element={
            <OwnerProtectedRoute>
              <OwnerDashboard />
            </OwnerProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>

  );
}

export default App;
