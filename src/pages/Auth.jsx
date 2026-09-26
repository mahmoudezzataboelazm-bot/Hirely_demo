import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card } from "../components/UI";
import { useApp } from "../context/AppContext";

export function Login() {
  const nav = useNavigate();
  const { setUser } = useApp();
  const [email, setEmail] = useState("sarah.alfarsi@hirely.com");
  const [pass, setPass] = useState("password");
  const [role, setRole] = useState("company-admin");
  const [error, setError] = useState("");
  const submit = () => {
    if (!email.includes("@") || pass.length < 6) return setError("Enter a valid email and a password with at least 6 characters.");
    const profiles = {
      "company-admin": { id: "u1", name: "Sarah Al-Farsi", email, role: "company-admin", title: "Senior Talent Acquisition Partner & Admin", company: "Hirely Tech Hub", location: "Riyadh, KSA" },
      recruiter: { id: "u2", name: "Sarah Johnson", email, role: "recruiter", title: "Recruiter", company: "Hirely Tech Hub", location: "Riyadh, KSA" },
      "super-admin": { id: "sa1", name: "Alex Rivers", email, role: "super-admin", title: "Super Admin", company: "Hirely", location: "Platform" },
      applicant: { id: "ap1", name: "Sara Ahmed", email, role: "applicant", title: "Applicant", company: "", location: "", skills: ["React.js", "JavaScript", "Figma"], experience: 3, education: "Bachelor's Degree" },
    };
    setUser(profiles[role]);
    nav(role === "applicant" ? "/browse-jobs" : role === "super-admin" ? "/super-admin/organizations" : "/dashboard");
  };
  return <div className="auth-page"><div className="auth-brand"><div className="brand-mark">H</div><b>Hirely</b></div><Card className="auth-card"><h1>Welcome back</h1><p>Sign in to your recruitment workspace.</p><label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" /></label><label>Password<input value={pass} onChange={e => setPass(e.target.value)} type="password" /></label><label>Demo role<select value={role} onChange={e => setRole(e.target.value)}><option value="company-admin">Company Admin</option><option value="recruiter">Recruiter</option><option value="applicant">Applicant</option><option value="super-admin">Super Admin</option></select></label>{error && <div className="form-error">{error}</div>}<div className="right"><button className="text-btn" onClick={() => setError("Password reset instructions would be sent to your email when the backend email service is connected.")}>Forgot password?</button></div><Button onClick={submit}>Sign in</Button><p className="center">Don't have an account? <Link to="/register">Create one</Link></p></Card></div>;
}

export function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const submit = () => {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.password.length < 8) return setError("Complete all fields. Password must contain at least 8 characters.");
    setUser({ id: `u-${Date.now()}`, name: f.name.trim(), email: f.email, role: "company-admin", title: "Company Admin", company: "", location: "" });
    nav("/onboarding/company");
  };
  return <div className="auth-page"><div className="auth-brand"><div className="brand-mark">H</div><b>Hirely</b></div><Card className="auth-card"><h1>Create your company account</h1><p>Standard registration is for Company Admins.</p><label>Full name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label><label>Work email<input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label><label>Password<input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>{error && <div className="form-error">{error}</div>}<Button onClick={submit}>Create account</Button><p className="center">Already registered? <Link to="/login">Sign in</Link></p></Card></div>;
}
