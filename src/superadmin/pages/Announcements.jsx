import { useState } from "react";
import { publishPlatformAnnouncement, getPlatformAnnouncements, getTenants } from "../../services/hirelyBridge";
import { Card, Badge, Dot, PageHeader, PrimaryButton, GhostButton } from "../components/ui";
import { Modal, Field, SelectField } from "../components/Modal";
import { Plus, Trash2 } from "../components/icons";

const PAGE_SIZE = 8;
const companies = getTenants().map((t) => t.name);

const statusTone = (status) =>
  status === "Published" ? "emerald" : status === "Scheduled" ? "amber" : "slate";

const formatSchedule = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export default function Announcements({ toast }) {
  // Published announcements are written to the shared store and appear on
  // the Company Admin Announcements page, with an in-app notification.
  const [items, setItems] = useState(() => getPlatformAnnouncements().map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.target,
    audienceType: a.target,
    status: a.scheduledFor ? "Scheduled" : "Published",
    tone: a.scheduledFor ? "amber" : "emerald",
    scheduleAt: a.scheduledFor || "",
  })));

  const [open, setOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "All companies",
    company: companies[0],
    delivery: "Save as draft",
    scheduleAt: "",
  });

  const resetForm = () => {
    setForm({
      title: "",
      body: "",
      audience: "All companies",
      company: companies[0],
      delivery: "Save as draft",
      scheduleAt: "",
    });
    setEditIdx(null);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (idx) => {
    const item = items[idx];
    const delivery = item.status === "Published" ? "Send now" : item.status === "Scheduled" ? "Schedule" : "Save as draft";
    setEditIdx(idx);
    setForm({
      title: item.title,
      body: item.body || "",
      audience: item.audienceType || (item.company ? "Specific company" : item.audience),
      company: item.company || companies[0],
      delivery,
      scheduleAt: item.scheduleAt || "",
    });
    setOpen(true);
  };

  const handleDelete = (idx) => {
    const title = items[idx].title;
    if (!window.confirm(`Delete announcement "${title}"?`)) return;
    setItems((list) => list.filter((_, i) => i !== idx));
    setPage(1);
    toast(`"${title}" deleted`);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast("Enter an announcement title");
    if (!form.body.trim()) return toast("Enter the announcement message");
    if (form.delivery === "Schedule" && !form.scheduleAt) return toast("Pick a schedule date and time");

    const audience = form.audience === "Specific company" ? `Specific company · ${form.company}` : form.audience;
    const status = form.delivery === "Send now" ? "Published" : form.delivery === "Schedule" ? "Scheduled" : "Draft";

    if (status === "Draft") {
      // Drafts stay on the platform side only — nothing reaches companies yet.
      setItems((list) => [{ title: form.title.trim(), body: form.body.trim(), audience, audienceType: form.audience, status, tone: statusTone(status), scheduleAt: "" }, ...list]);
      toast("Announcement saved as draft");
    } else {
      const result = publishPlatformAnnouncement({
        title: form.title,
        body: form.body,
        target: audience,
        scheduledFor: form.delivery === "Schedule" ? form.scheduleAt : "",
      });
      if (result.error) return toast(result.error);
      setItems((list) => [{ id: result.announcement.id, title: result.announcement.title, body: result.announcement.body, audience, audienceType: form.audience, status, tone: statusTone(status), scheduleAt: result.announcement.scheduledFor }, ...list]);
      toast(status === "Published" ? "Announcement delivered to company admins" : "Announcement scheduled");
    }

    setOpen(false);
    resetForm();
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Broadcast platform-wide notices to companies, filtered by tier or account status."
        action={<PrimaryButton icon={Plus} onClick={openNew}>New announcement</PrimaryButton>}
      />
      <Card>
        <div className="responsive-table-wrap">
          <table className="w-full text-sm admin-table announcements-table">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-400 uppercase">
                <th className="p-4">Announcement</th>
                <th className="p-4">Audience</th>
                <th className="p-4">Status</th>
                <th className="p-4">Schedule</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((i) => (
                <tr key={`${i.id || i.title}-${i.status}`} className="border-t border-slate-100">
                  <td className="p-4 font-semibold text-slate-900">{i.title}</td>
                  <td className="p-4"><Badge>{i.audience}</Badge></td>
                  <td className="p-4"><span className="inline-flex items-center gap-1.5"><Dot tone={i.tone} />{i.status}</span></td>
                  <td className="p-4 text-slate-500 text-xs">{i.status === "Scheduled" ? formatSchedule(i.scheduleAt) : "—"}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(items.indexOf(i))} className="text-xs font-semibold text-indigo-700">Edit</button>
                      <button onClick={() => handleDelete(items.indexOf(i))} className="text-xs font-semibold text-rose-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Showing {items.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, items.length)} of {items.length} announcements</span>
          <div className="pagination"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(items.length / PAGE_SIZE))}</span><button disabled={page === Math.max(1, Math.ceil(items.length / PAGE_SIZE))} onClick={() => setPage((p) => p + 1)}>Next</button></div>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={editIdx !== null ? "Edit announcement" : "New announcement"}
        footer={<><GhostButton onClick={() => { setOpen(false); resetForm(); }}>Cancel</GhostButton><PrimaryButton onClick={handleSave}>{editIdx !== null ? "Save changes" : "Create"}</PrimaryButton></>}
      >
        <Field label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Field label="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <SelectField
          label="Audience"
          options={["All companies", "Starter tier", "Growth tier", "Enterprise tier", "Specific company"]}
          value={form.audience}
          onChange={(e) => setForm({ ...form, audience: e.target.value })}
        />
        {form.audience === "Specific company" && (
          <SelectField label="Company" options={companies} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        )}
        <SelectField
          label="Delivery"
          options={["Save as draft", "Send now", "Schedule"]}
          value={form.delivery}
          onChange={(e) => setForm({ ...form, delivery: e.target.value })}
        />
        {form.delivery === "Schedule" && (
          <Field label="Schedule date and time" type="datetime-local" value={form.scheduleAt} onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })} />
        )}
      </Modal>
    </div>
  );
}
