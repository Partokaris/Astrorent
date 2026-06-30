import { Navigate } from "react-router-dom";

function FinderProtectedRoute({ children }) {
  const token = localStorage.getItem("finder_token");
  const accountType = localStorage.getItem("finder_account_type");

  if (!token || accountType !== "home_finder") {
    return <Navigate to="/login" />;
  }

  return children;
}

export default FinderProtectedRoute;
