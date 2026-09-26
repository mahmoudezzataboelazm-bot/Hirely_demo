/* ---------------------------------------------------------------------
   Icons — plain inline SVGs (no lucide-react, no extra npm install).
--------------------------------------------------------------------- */
export function IconBase({ children, size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}
export const LayoutGrid = (p) => (
  <IconBase {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </IconBase>
);
export const Building2 = (p) => (
  <IconBase {...p}>
    <rect x="4" y="3" width="16" height="18" rx="1" />
    <path d="M9 21v-4h6v4" />
    <path d="M9 7h1M14 7h1M9 11h1M14 11h1" />
  </IconBase>
);
export const Users = (p) => (
  <IconBase {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M2 21c0-4 3-6 7-6s7 2 7 6" />
    <circle cx="17" cy="8" r="2.3" />
    <path d="M22 21c0-3-2-5-4-5.5" />
  </IconBase>
);
export const CreditCard = (p) => (
  <IconBase {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </IconBase>
);
export const BarChart3 = (p) => (
  <IconBase {...p}>
    <path d="M3 21V9M10 21V3M17 21v-7" />
  </IconBase>
);
export const Cpu = (p) => (
  <IconBase {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </IconBase>
);
export const Settings = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </IconBase>
);
export const Bell = (p) => (
  <IconBase {...p}>
    <path d="M6 8a6 6 0 1112 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8z" />
    <path d="M10 19a2 2 0 004 0" />
  </IconBase>
);
export const HelpCircle = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2 1.7-2 3.2" />
    <path d="M12 17h.01" />
  </IconBase>
);
export const Search = (p) => (
  <IconBase {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </IconBase>
);
export const ChevronDown = (p) => (
  <IconBase {...p}>
    <path d="M6 9l6 6 6-6" />
  </IconBase>
);
export const ChevronRight = (p) => (
  <IconBase {...p}>
    <path d="M9 6l6 6-6 6" />
  </IconBase>
);
export const Plus = (p) => (
  <IconBase {...p}>
    <path d="M12 5v14M5 12h14" />
  </IconBase>
);
export const Rocket = (p) => (
  <IconBase {...p}>
    <path d="M12 2c3 2 5 6 5 10 0 3-1 5-1 5H8s-1-2-1-5c0-4 2-8 5-10z" />
    <circle cx="12" cy="10" r="2" />
    <path d="M8 17l-2 4M16 17l2 4" />
  </IconBase>
);
export const Sliders = (p) => (
  <IconBase {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </IconBase>
);
export const BookOpen = (p) => (
  <IconBase {...p}>
    <path d="M2 5c3-1 6-1 10 1v13c-4-2-7-2-10-1V5z" />
    <path d="M22 5c-3-1-6-1-10 1v13c4-2 7-2 10-1V5z" />
  </IconBase>
);
export const Megaphone = (p) => (
  <IconBase {...p}>
    <path d="M3 11v2a2 2 0 002 2h1l3 5V4l-3 5H5a2 2 0 00-2 2z" />
    <path d="M13 8a4 4 0 010 8" />
    <path d="M17 5a8 8 0 010 14" />
  </IconBase>
);
export const Bug = (p) => (
  <IconBase {...p}>
    <rect x="8" y="8" width="8" height="10" rx="4" />
    <path d="M12 8V5M9 5 7 3M15 5l2-2M4 12h4M16 12h4M5 18l3-2M19 18l-3-2M5 8l3 2M19 8l-3 2" />
  </IconBase>
);
export const LogOut = (p) => (
  <IconBase {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </IconBase>
);
export const LifeBuoy = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
    <path d="M4.9 4.9l3.5 3.5M19.1 4.9l-3.5 3.5M4.9 19.1l3.5-3.5M19.1 19.1l-3.5-3.5" />
  </IconBase>
);
export const Sigma = (p) => (
  <IconBase {...p}>
    <path d="M18 4H6l6 8-6 8h12" />
  </IconBase>
);
export const X = (p) => (
  <IconBase {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </IconBase>
);
export const Download = (p) => (
  <IconBase {...p}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 21h16" />
  </IconBase>
);
export const MoreVertical = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="5" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="12" cy="19" r="1.2" />
  </IconBase>
);
export const Trash2 = (p) => (
  <IconBase {...p}>
    <path d="M4 7h16" />
    <path d="M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" />
    <path d="M9 7V4h6v3" />
  </IconBase>
);
export const LogIn = (p) => (
  <IconBase {...p}>
    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
    <path d="M8 17l-5-5 5-5" />
    <path d="M3 12h13" />
  </IconBase>
);
export const Ban = (p) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </IconBase>
);
export const Mail = (p) => (
  <IconBase {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 6l10 7 10-7" />
  </IconBase>
);
export const Check = (p) => (
  <IconBase {...p}>
    <path d="M4 12l6 6L20 6" />
  </IconBase>
);
export const Sparkles = (p) => (
  <IconBase {...p}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z" />
  </IconBase>
);
export const Pencil = (p) => (
  <IconBase {...p}>
    <path d="M4 20l4.5-1 10-10a2.1 2.1 0 00-3-3l-10 10L4 20z" />
    <path d="M14.5 6.5l3 3" />
  </IconBase>
);
export const RotateCcw = (p) => (
  <IconBase {...p}>
    <path d="M3 12a9 9 0 109-9 9.5 9.5 0 00-6.4 2.6L3 8" />
    <path d="M3 3v5h5" />
  </IconBase>
);
export const Camera = (p) => (
  <IconBase {...p}>
    <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </IconBase>
);

export const Activity = (p) => (
  <IconBase {...p}><path d="M3 12h4l2-7 4 14 2-7h6" /></IconBase>
);
export const UserCircle = (p) => (
  <IconBase {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9" r="3" /><path d="M6.5 19c1.2-2.3 3-3.5 5.5-3.5s4.3 1.2 5.5 3.5" /></IconBase>
);

export const Eye = (p) => (
  <IconBase {...p}>
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
    <circle cx="12" cy="12" r="2.5" />
  </IconBase>
);

export const Menu = (p) => (
  <IconBase {...p}><path d="M4 6h16M4 12h16M4 18h16" /></IconBase>
);
