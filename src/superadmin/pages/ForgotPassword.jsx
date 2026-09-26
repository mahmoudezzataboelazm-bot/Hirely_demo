import { useState } from "react";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <div className="super-login-screen">
      <div className="super-login-card">
        <div className="login-brand"><div className="profile-avatar">H</div><div><strong>Hirely</strong><span>Super Admin Portal</span></div></div>
        {!sent ? (
          <>
            <h1>Reset your password</h1>
            <p>Enter your email address and we’ll send you a password reset link.</p>
            <form onSubmit={submit}>
              <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" /></label>
              <button className="login-submit" type="submit">Send reset link</button>
            </form>
            <button className="forgot-link" onClick={onBack}>Back to login</button>
          </>
        ) : (
          <>
            <h1>Check your email</h1>
            <p>If an account exists for <strong>{email}</strong>, a password reset link has been sent.</p>
            <button className="login-submit" onClick={onBack}>Back to login</button>
          </>
        )}
      </div>
    </div>
  );
}
