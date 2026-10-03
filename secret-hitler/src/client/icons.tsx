// Original, fictional iconography. No real-world political symbols.

type P = { className?: string; title?: string };

const svg = (title: string | undefined, className: string | undefined, children: React.ReactNode, vb = "0 0 24 24") => (
  <svg viewBox={vb} className={className} fill="currentColor" aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
    {title && <title>{title}</title>}
    {children}
  </svg>
);

/** Liberal: a dove in flight. */
export const Dove = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path d="M3 13.5c2.8.2 5-.6 6.6-2.4L6.4 4.6c3.4.9 5.9 3 7.2 6.3.7-1.9 2.4-3.1 4.4-3.1.9 0 1.5.3 2.1.8l2.4-.5-1.6 1.8c.1.4.1.8.1 1.2 0 3.9-3.3 7.1-7.6 7.1-1.3 0-2.6-.3-3.7-.8L6.6 19.6l.9-3.6C5.7 15.6 4.2 14.7 3 13.5z" />,
  );

/** Fascist: a coiled serpent inside a sharp chevron (fictional emblem). */
export const Serpent = ({ className, title }: P) =>
  svg(
    title,
    className,
    <>
      <path d="M12 1.5 22.5 12 12 22.5 1.5 12z" fillOpacity="0.18" />
      <path d="M15.8 6.2c-1.3-1-3-1.3-4.6-.8-2 .6-3.2 2.5-2.7 4.3.4 1.5 1.9 2.2 3.5 2.4 1.4.2 2.4.7 2.5 1.7.1 1.2-1.1 2-2.6 2-1.3 0-2.4-.5-3.2-1.4l-1.4 1.5c1.2 1.3 2.9 2 4.7 2 2.6 0 4.8-1.6 4.7-4.1-.1-2.2-1.9-3.4-4.3-3.7-1-.1-1.7-.4-1.8-1-.2-.8.4-1.5 1.3-1.7.9-.3 1.9-.1 2.6.5l.6-.4 1.9.4-.2-1.9z" />
      <circle cx="15.6" cy="6.9" r=".55" fill="var(--bg)" />
    </>,
  );

/** Hitler: a skull. */
export const Skull = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path
      fillRule="evenodd"
      d="M12 2C7 2 3.5 5.4 3.5 9.9c0 2.6 1.2 4.6 3 5.8V19c0 .8.7 1.5 1.5 1.5h1v-2h1.5v2h3v-2H15v2h1c.8 0 1.5-.7 1.5-1.5v-3.3c1.8-1.2 3-3.2 3-5.8C20.5 5.4 17 2 12 2zM8.6 13.6a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zm6.8 0a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM12 14.2l1.1 2h-2.2z"
    />,
  );

export const Eye = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path
      fillRule="evenodd"
      d="M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
    />,
  );

export const Cards = ({ className, title }: P) =>
  svg(
    title,
    className,
    <>
      <rect x="2" y="6" width="8" height="12" rx="1.2" transform="rotate(-12 6 12)" fillOpacity=".55" />
      <rect x="8" y="5" width="8" height="13" rx="1.2" fillOpacity=".8" />
      <rect x="14" y="6" width="8" height="12" rx="1.2" transform="rotate(12 18 12)" />
    </>,
  );

export const Podium = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path d="M12 1.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5zM6 13h12l-1 3H7zm2 4h8l-1 5H9z" />,
  );

export const Crosshair = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path
      fillRule="evenodd"
      d="M11 2h2v3.1A7 7 0 0 1 18.9 11H22v2h-3.1A7 7 0 0 1 13 18.9V22h-2v-3.1A7 7 0 0 1 5.1 13H2v-2h3.1A7 7 0 0 1 11 5.1zm1 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 3.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"
    />,
  );

export const Gavel = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path d="M13.6 2.3l6.1 6.1-2.1 2.1-1-1-3.6 3.6 1 1-2.1 2.1-6.1-6.1 2.1-2.1 1 1 3.6-3.6-1-1zM8.5 15.6l2 2-6 6-2-2zM13 20h9v2h-9z" />,
  );

export const Crown = ({ className, title }: P) =>
  svg(title, className, <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5zm2 12.5h14V21H5z" />);

export const Question = ({ className, title }: P) =>
  svg(
    title,
    className,
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 16h-2v-2h2zm2.1-7.7-.9.9c-.7.7-1.2 1.3-1.2 2.8h-2v-.5c0-1.1.5-2.1 1.2-2.8l1.2-1.3c.4-.3.6-.8.6-1.4a2 2 0 0 0-4 0H8a4 4 0 0 1 8 0c0 .9-.4 1.7-.9 2.3z" />,
  );

export const Scroll = ({ className, title }: P) =>
  svg(title, className, <path d="M6 3h11a3 3 0 0 1 3 3v1h-3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1h3zm2 4v2h7V7zm0 4v2h7v-2zm0 4v2h5v-2z" />);

export const PowerIcon = ({ power, className }: { power: string | null; className?: string }) => {
  if (power === "investigate") return <Eye className={className} title="Investigate Loyalty" />;
  if (power === "peek") return <Cards className={className} title="Policy Peek" />;
  if (power === "special") return <Podium className={className} title="Special Election" />;
  if (power === "execute") return <Crosshair className={className} title="Execution" />;
  return null;
};
