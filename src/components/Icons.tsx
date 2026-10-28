import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { className?: string }

function Base({ children, className = 'h-4 w-4', ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const HospitalIcon = (p: IconProps) => (
  <Base {...p}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M12 7v6M9 10h6M8 21v-4h8v4" /></Base>
)
export const PlusIcon = (p: IconProps) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
export const DownloadIcon = (p: IconProps) => <Base {...p}><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" /></Base>
export const UsersIcon = (p: IconProps) => (
  <Base {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4" /></Base>
)
export const PencilIcon = (p: IconProps) => (
  <Base {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" /><path d="M14 7l3 3" /></Base>
)
export const SwapIcon = (p: IconProps) => (
  <Base {...p}><path d="M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3" /></Base>
)
export const ShieldIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></Base>
)
export const FileIcon = (p: IconProps) => (
  <Base {...p}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h6M10 16h6" /></Base>
)
export const PulseIcon = (p: IconProps) => (
  <Base {...p}><path d="M3 12h4l2-5 3 10 2-5h5" /></Base>
)
export const KeyIcon = (p: IconProps) => (
  <Base {...p}><circle cx="8" cy="15" r="3" /><path d="M10.5 12.5 19 4m-3 1 2 2m-5 1 2 2" /></Base>
)
export const PaperclipIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" /></Base>
)
export const CameraIcon = (p: IconProps) => (
  <Base {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3" /><path d="M8 7l1.5-3h5L16 7" /></Base>
)
export const MoonIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></Base>
)
export const SunIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></Base>
)
export const PrinterIcon = (p: IconProps) => (
  <Base {...p}><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="8" rx="1.5" /><path d="M7 14h10v7H7z" /></Base>
)
export const WarningIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 3l9 16H3L12 3z" /><path d="M12 9v4M12 16h.01" /></Base>
)
export const XIcon = (p: IconProps) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>
export const ChevronDownIcon = (p: IconProps) => <Base {...p}><path d="M6 9l6 6 6-6" /></Base>
export const CheckIcon = (p: IconProps) => <Base {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Base>
export const ChevronLeftIcon = (p: IconProps) => <Base {...p}><path d="M15 5l-7 7 7 7" /></Base>
export const ChevronRightIcon = (p: IconProps) => <Base {...p}><path d="M9 5l7 7-7 7" /></Base>
export const UserIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Base>
)
