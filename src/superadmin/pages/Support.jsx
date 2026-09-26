import { Card, PageHeader, GhostButton } from "../components/ui";
import { LifeBuoy, Search, Mail, Activity } from "../components/icons";

export default function Support({ setPage }) {
  return (
    <div className="admin-page">
      <PageHeader title="Support Center" subtitle="Get help with platform administration or contact the Hirely support team." />
      <div className="support-page-grid">
        <Card className="p-5">
          <div className="support-card-icon"><Search size={18} /></div>
          <h3>Help & documentation</h3>
          <p>Find guidance for Companies, Subscriptions, AI Monitor, DFS Configuration and other platform areas.</p>
          <div className="flex flex-wrap gap-2"><GhostButton onClick={() => setPage("companies")}>Companies</GhostButton><GhostButton onClick={() => setPage("subscriptions")}>Billing</GhostButton><GhostButton onClick={() => setPage("aimonitor")}>AI Monitor</GhostButton></div>
        </Card>
        <Card className="p-5">
          <div className="support-card-icon"><LifeBuoy size={18} /></div>
          <h3>Contact support</h3>
          <p>Need assistance from the Hirely support team? Send an email directly. Support is an external contact channel, not a separate system role.</p>
          <a className="support-mail-btn" href="mailto:support@hirely.com?subject=Hirely%20Super%20Admin%20Support"><Mail size={15} /> Send email to support</a>
          <div className="support-email-note">support@hirely.com</div>
        </Card>
        <Card className="p-5">
          <div className="support-card-icon"><Activity size={18} /></div>
          <h3>System status</h3>
          <p>Current demo status for the main Hirely platform services.</p>
          <div className="support-status large"><span className="status-dot" /> All systems operational</div>
        </Card>
        <Card className="p-5">
          <div className="support-card-icon"><Search size={18} /></div>
          <h3>Reported Issues</h3>
          <p>Review issues reported by platform users and manage their status or escalation level.</p>
          <GhostButton onClick={() => setPage("reportedissues")}>Open reported issues</GhostButton>
        </Card>
      </div>
    </div>
  );
}
