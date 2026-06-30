import { Navigate } from "react-router-dom";

function OwnerProtectedRoute({ children }) {
  const token = localStorage.getItem("owner_token");
  const accountType = localStorage.getItem("owner_account_type");

  if (!token || accountType !== "home_owner") {
    return <Navigate to="/login" />;
  }

  return children;
}

export default OwnerProtectedRoute;
