import type { ReactNode, SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  children: ReactNode;
}

export function Icon({ children, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconReview() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.6 12.2 2.2 2.2 4.6-4.8" />
    </Icon>
  );
}

export function IconVideos() {
  return (
    <Icon>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="m11 9.5 4.2 2.5-4.2 2.5z" />
    </Icon>
  );
}

export function IconInstagram() {
  return (
    <Icon>
      <rect x="4" y="6.5" width="16" height="12" rx="3" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="m9 6.5 1-2h4l1 2" />
    </Icon>
  );
}

export function IconRender() {
  return (
    <Icon>
      <path d="m12 3.5 8 4.2-8 4.3-8-4.3 8-4.2z" />
      <path d="m4 12 8 4.2 8-4.2" />
      <path d="m4 16.2 8 4.3 8-4.3" />
    </Icon>
  );
}

export function IconActivity() {
  return (
    <Icon>
      <path d="M5 15.5 9 8l3 6 2.2-3.2L19 15.5" />
      <path d="M4 19h16" />
    </Icon>
  );
}

export function IconSettings() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5" />
    </Icon>
  );
}

export function IconRefresh({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4.5V10h-5.5" />
    </Icon>
  );
}

export function IconClose() {
  return (
    <Icon>
      <path d="m7 7 10 10M17 7 7 17" />
    </Icon>
  );
}

export function IconCheck() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.6 12.2 2.2 2.2 4.6-4.8" />
    </Icon>
  );
}
