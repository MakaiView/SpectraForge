/** Stroked 24×24 nav icons, lifted from the prototype. stroke=currentColor. */
export function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
  } as const;
  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "recipes":
      return (
        <svg {...common}>
          <path d="M4 5h16M4 12h16M4 19h10" />
        </svg>
      );
    case "materials":
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
        </svg>
      );
    case "machines":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="8" rx="1.5" />
          <path d="M7 12v3M17 12v3M5 18h14" />
          <circle cx="12" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "calibration":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
    case "attempts":
      return (
        <svg {...common}>
          <path d="M12 8v4l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "favorites":
      return (
        <svg {...common}>
          <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" />
        </svg>
      );
    case "review":
      return (
        <svg {...common}>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      );
    case "tools":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.6-.6-2.5z" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common}>
          <path d="M12 2l7 3v6c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V5z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    default:
      return <svg {...common} />;
  }
}
