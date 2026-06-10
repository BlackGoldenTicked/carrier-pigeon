import React, { type SVGProps } from 'react'

/**
 * 功能性图标，来自 Iconoir (iconoir.com, MIT)
 * 描边风格，currentColor 着色，尺寸由 className 控制
 */
type IconProps = SVGProps<SVGSVGElement>

const Stroke = ({ children, className, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
)

export const SettingsIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
    <path d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155C16.6969 18.8313 18 20 18 20L20 18L18.5159 16.2494L19.6139 13.598L21.9999 12.9772L22 11L19.6224 10.3954Z" />
  </Stroke>
)

export const SendIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M22.1525 3.55321L11.1772 21.0044L9.50686 12.4078L2.00002 7.89795L22.1525 3.55321Z" />
    <path d="M9.45557 12.4436L22.1524 3.55321" />
  </Stroke>
)

export const ArrowUpRightIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M6.00005 19L19 5.99996M19 5.99996V18.48M19 5.99996H6.52005" />
  </Stroke>
)

export const ArrowUpIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M12 21L12 3M12 3L20.5 11.5M12 3L3.5 11.5" />
  </Stroke>
)

export const ArrowLeftIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M21 12L3 12M3 12L11.5 3.5M3 12L11.5 20.5" />
  </Stroke>
)

export const XmarkIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426" />
  </Stroke>
)

export const CheckIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M5 13L9 17L19 7" />
  </Stroke>
)

export const LinkIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M14 11.9976C14 9.5059 11.683 7 8.85714 7C8.52241 7 7.41904 7.00001 7.14286 7.00001C4.30254 7.00001 2 9.23752 2 11.9976C2 14.376 3.70973 16.3664 6 16.8714C6.36756 16.9525 6.75006 16.9952 7.14286 16.9952" />
    <path d="M10 11.9976C10 14.4893 12.317 16.9952 15.1429 16.9952C15.4776 16.9952 16.581 16.9952 16.8571 16.9952C19.6975 16.9952 22 14.7577 22 11.9976C22 9.6192 20.2903 7.62884 18 7.12383C17.6324 7.04278 17.2499 6.99999 16.8571 6.99999" />
  </Stroke>
)

export const SunIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" />
    <path d="M22 12L23 12" />
    <path d="M12 2V1" />
    <path d="M12 23V22" />
    <path d="M20 20L19 19" />
    <path d="M20 4L19 5" />
    <path d="M4 20L5 19" />
    <path d="M4 4L5 5" />
    <path d="M1 12L2 12" />
  </Stroke>
)

export const MoonIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M3 11.5066C3 16.7497 7.25034 21 12.4934 21C16.2209 21 19.4466 18.8518 21 15.7259C12.4934 15.7259 8.27411 11.5066 8.27411 3C5.14821 4.55344 3 7.77915 3 11.5066Z" />
  </Stroke>
)

export const VideoIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M15 12V16.4C15 16.7314 14.7314 17 14.4 17H3.6C3.26863 17 3 16.7314 3 16.4V7.6C3 7.26863 3.26863 7 3.6 7H14.4C14.7314 7 15 7.26863 15 7.6V12ZM15 12L20.0159 7.82009C20.4067 7.49443 21 7.77232 21 8.28103V15.719C21 16.2277 20.4067 16.5056 20.0159 16.1799L15 12Z" />
  </Stroke>
)

export const VideoOffIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M6.5 7H3.6C3.26863 7 3 7.26863 3 7.6V16.4C3 16.7314 3.26863 17 3.6 17H14.4C14.7314 17 15 16.7314 15 16.4V15M11.5 7H14.4C14.7314 7 15 7.26863 15 7.6V10.719C15 11.2277 15.5933 11.5056 15.9841 11.1799L20.0159 7.82009C20.4067 7.49443 21 7.77232 21 8.28103V15.5" />
    <path d="M3 3L21 21" />
  </Stroke>
)

export const TextIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M4 7V5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V7" />
    <path d="M12 4V20" />
    <path d="M9 20H15" />
  </Stroke>
)

export const ImageIcon = (props: IconProps) => (
  <Stroke {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 16L8 11C8.92804 10.1078 10.072 10.1078 11 11L16 16" />
    <path d="M14 14L15 13C15.928 12.1078 17.072 12.1078 18 13L21 16" />
    <circle cx="13.5" cy="8.5" r="1.5" />
  </Stroke>
)

export const ImageOffIcon = (props: IconProps) => (
  <Stroke {...props}>
    <path d="M21 15V5C21 3.89543 20.1046 3 19 3H7M3 7V19C3 20.1046 3.89543 21 5 21H17" />
    <path d="M3 16L8 11C8.71524 10.3128 9.5547 10.1338 10.3206 10.4631" />
    <path d="M14 14L15 13C15.928 12.1078 17.072 12.1078 18 13L21 16" />
    <path d="M3 3L21 21" />
  </Stroke>
)

export const SparksIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" {...props}>
    <path d="M8 15C12.8747 15 15 12.949 15 8C15 12.949 17.1104 15 22 15C17.1104 15 15 17.1104 15 22C15 17.1104 12.8747 15 8 15Z" />
    <path d="M2 6.5C5.13376 6.5 6.5 5.18153 6.5 2C6.5 5.18153 7.85669 6.5 11 6.5C7.85669 6.5 6.5 7.85669 6.5 11C6.5 7.85669 5.13376 6.5 2 6.5Z" />
  </svg>
)
