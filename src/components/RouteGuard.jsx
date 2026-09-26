import React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function RouteGuard({ permission, roles, children }) {
  const { user, hasPermission } = useApp();
  const allowed = roles ? roles.includes(user?.role) : permission ? hasPermission(permission) : true;
  return allowed ? children : <Navigate to={user?.role === "applicant" ? "/browse-jobs" : "/dashboard"} replace />;
}
