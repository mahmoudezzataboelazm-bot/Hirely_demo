import { useRef, useState } from "react";
import { Card, PageHeader, PrimaryButton, GhostButton, Badge } from "../components/ui";
import { Field } from "../components/Modal";
import { Camera, Check } from "../components/icons";

export default function Profile({ toast }) {
  const [profile, setProfile] = useState({ name: "Nadia Suleiman", email: "nadia@hirely.com", phone: "+20 100 000 0000" });
  const [photo, setPhoto] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const fileRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!profile.name.trim() || !profile.email.trim()) return toast("Name and email are required");
    toast("Profile updated successfully");
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.next || passwords.next !== passwords.confirm) {
      toast("Please complete the password fields and make sure they match");
      return;
    }
    setPasswords({ current: "", next: "", confirm: "" });
    toast("Password updated successfully");
  };

  return (
    <div className="admin-page">
      <PageHeader title="My Profile" subtitle="Manage your Super Admin account, profile information, and security credentials." />
      <div className="profile-grid">
        <Card className="p-6">
          <div className="profile-photo-row">
            <div className="profile-avatar large">
              {photo ? <img src={photo} alt="Profile" /> : "NS"}
            </div>
            <div>
              <button className="profile-photo-btn" onClick={() => fileRef.current?.click()}><Camera size={15} /> Change photo</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <p className="muted small-text">JPG or PNG. Use a clear professional photo.</p>
            </div>
          </div>
          <div className="profile-fields">
            <Field label="Full name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Field label="Email" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            <Field label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
            <div className="profile-readonly"><span>Role</span><strong>Super Admin</strong></div>
            <div className="profile-readonly"><span>Account status</span><Badge tone="emerald"><Check size={11} /> Active</Badge></div>
            <div className="profile-readonly"><span>Last login</span><strong>Today, 10:42 PM</strong></div>
          </div>
          <div className="profile-actions"><PrimaryButton onClick={saveProfile}>Save changes</PrimaryButton></div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900">Security Credentials</h3>
          <p className="muted small-text" style={{ marginTop: 5, marginBottom: 18 }}>Update your password regularly to keep platform access secure.</p>
          <form onSubmit={changePassword} className="profile-fields">
            <Field label="Current password" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            <Field label="New password" type="password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            <Field label="Confirm new password" type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            <div className="profile-actions"><GhostButton type="submit">Update password</GhostButton></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
