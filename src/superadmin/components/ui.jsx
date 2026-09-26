/* ---------------------------------------------------------------------
   Small shared building blocks used across every page.
--------------------------------------------------------------------- */

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center text-white font-bold text-sm">
        H
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-900 text-[15px] tracking-tight">
          Hirely
        </div>
        <div className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">
          Super Admin Portal
        </div>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "slate" }) {
  const tones = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    slate: "bg-slate-400",
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${tones[tone]}`} />
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative w-9 h-5 rounded-full transition-colors ${disabled ? "bg-slate-100 cursor-not-allowed" : on ? "bg-indigo-600" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 page-header">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 max-w-xl">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PrimaryButton({
  children,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
