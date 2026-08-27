export type IconName =
  | "music"
  | "upload"
  | "close"
  | "swap"
  | "lock"
  | "arrow"
  | "check"
  | "alert"
  | "spark";

export default function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths = {
    music: (
      <>
        <path {...p} d="M9 18V5l11-2v13" />
        <circle {...p} cx="6" cy="18" r="3" />
        <circle {...p} cx="17" cy="16" r="3" />
      </>
    ),
    upload: <path {...p} d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15.5V20h14v-4.5" />,
    close: <path {...p} d="m7 7 10 10M17 7 7 17" />,
    swap: <path {...p} d="M7 7h11m0 0-3-3m3 3-3 3M17 17H6m0 0 3 3m-3-3 3-3" />,
    lock: (
      <>
        <rect {...p} x="5" y="10" width="14" height="10" rx="2" />
        <path {...p} d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    arrow: <path {...p} d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path {...p} d="m5 12 4.2 4L19 6.5" />,
    alert: (
      <>
        <path {...p} d="M12 4 3.8 19h16.4L12 4Z" />
        <path {...p} d="M12 9v4m0 3h.01" />
      </>
    ),
    spark: (
      <path {...p} d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}
