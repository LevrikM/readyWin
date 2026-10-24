import type {SVGProps} from 'react'

type IconProps = SVGProps<SVGSVGElement> & {size?: number}

function Icon({size = 20, children, ...props}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function LogoMark({size = 30}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="28" height="28" rx="4" fill="var(--accent)"/>
      <rect x="6" y="6" width="8" height="8" rx="1" fill="var(--paper)"/>
      <rect x="16" y="6" width="8" height="8" rx="1" fill="var(--paper)" fillOpacity=".55"/>
      <rect x="6" y="16" width="8" height="8" rx="1" fill="var(--paper)" fillOpacity=".55"/>
      <path d="M16.5 24v-7.5H24" stroke="var(--paper)" strokeWidth="1.4"/>
    </svg>
  )
}

export function IconOverview(props: IconProps) {
  return <Icon {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/></Icon>
}

export function IconCatalog(props: IconProps) {
  return <Icon {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Icon>
}

export function IconSystem(props: IconProps) {
  return <Icon {...props}><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></Icon>
}

export function IconHistory(props: IconProps) {
  return <Icon {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></Icon>
}

export function IconQueue(props: IconProps) {
  return <Icon {...props}><path d="M4 6h16M4 12h16M4 18h10"/><path d="m17 16 2 2 3-3"/></Icon>
}

export function IconSearch(props: IconProps) {
  return <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></Icon>
}

export function IconRefresh(props: IconProps) {
  return <Icon {...props}><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18.7 7M17.9 16A7 7 0 0 1 5.3 17"/></Icon>
}

export function IconPlus(props: IconProps) {
  return <Icon {...props}><path d="M12 5v14M5 12h14"/></Icon>
}

export function IconMinus(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14"/></Icon>
}

export function IconCheck(props: IconProps) {
  return <Icon {...props}><path d="m4.5 12.5 5 5L19.5 7"/></Icon>
}

export function IconArrowRight(props: IconProps) {
  return <Icon {...props}><path d="M4 12h16M14 6l6 6-6 6"/></Icon>
}

export function IconArrowUpRight(props: IconProps) {
  return <Icon {...props}><path d="M7 17 17 7M8 7h9v9"/></Icon>
}

export function IconX(props: IconProps) {
  return <Icon {...props}><path d="m5 5 14 14M19 5 5 19"/></Icon>
}

export function IconChevronDown(props: IconProps) {
  return <Icon {...props}><path d="m6 9 6 6 6-6"/></Icon>
}

export function IconChevronRight(props: IconProps) {
  return <Icon {...props}><path d="m9 6 6 6-6 6"/></Icon>
}

export function IconTrash(props: IconProps) {
  return <Icon {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></Icon>
}

export function IconCopy(props: IconProps) {
  return <Icon {...props}><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V4H4v12h4"/></Icon>
}

export function IconDownload(props: IconProps) {
  return <Icon {...props}><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></Icon>
}

export function IconInfo(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></Icon>
}

export function IconShield(props: IconProps) {
  return <Icon {...props}><path d="M12 3 4.5 6v5.5c0 4.5 3 7.7 7.5 10 4.5-2.3 7.5-5.5 7.5-10V6L12 3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></Icon>
}

export function IconCpu(props: IconProps) {
  return <Icon {...props}><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/></Icon>
}

export function IconMemory(props: IconProps) {
  return <Icon {...props}><rect x="3" y="7" width="18" height="9" rx="1"/><path d="M7 10v3M11 10v3M15 10v3M19 10v3M7 16v3M17 16v3"/></Icon>
}

export function IconDisk(props: IconProps) {
  return <Icon {...props}><ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></Icon>
}

export function IconTerminal(props: IconProps) {
  return <Icon {...props}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="m7 9 3 3-3 3M13 15h4"/></Icon>
}

export function IconExternal(props: IconProps) {
  return <Icon {...props}><path d="M14 4h6v6M20 4l-9 9M19 14v6H4V5h6"/></Icon>
}

export function IconFilter(props: IconProps) {
  return <Icon {...props}><path d="M4 6h16M7 12h10M10 18h4"/></Icon>
}

export function IconSun(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></Icon>
}

export function IconMoon(props: IconProps) {
  return <Icon {...props}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z"/></Icon>
}

export function IconSettings(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></Icon>
}

export function IconAlert(props: IconProps) {
  return <Icon {...props}><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17v.5"/></Icon>
}

export function IconCircleCheck(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></Icon>
}

export function IconCircleX(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></Icon>
}

export function IconWindowMinimize(props: IconProps) {
  return <Icon {...props} strokeWidth="1.4"><path d="M5 12h14"/></Icon>
}

export function IconWindowMaximize(props: IconProps) {
  return <Icon {...props} strokeWidth="1.4"><rect x="5.5" y="5.5" width="13" height="13"/></Icon>
}

export function IconWindowRestore(props: IconProps) {
  return <Icon {...props} strokeWidth="1.4"><rect x="4.5" y="7.5" width="11" height="11"/><path d="M8 7.5v-3h11v11h-3"/></Icon>
}

export function IconWindowClose(props: IconProps) {
  return <Icon {...props} strokeWidth="1.4"><path d="m6 6 12 12M18 6 6 18"/></Icon>
}

export function IconPresetBase(props: IconProps) {
  return <Icon {...props}><path d="M4 10.5 12 4l8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/></Icon>
}

export function IconPresetDev(props: IconProps) {
  return <Icon {...props}><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></Icon>
}

export function IconPresetGames(props: IconProps) {
  return <Icon {...props}><path d="M7 8h10a5 5 0 0 1 4.5 7.2l-1 2.2a2.4 2.4 0 0 1-4.1.5L14.5 16h-5l-1.9 1.9a2.4 2.4 0 0 1-4.1-.5l-1-2.2A5 5 0 0 1 7 8Z"/><path d="M8 11v3M6.5 12.5h3M15.5 11.5h.01M18 13.5h.01"/></Icon>
}

export function IconPresetCreative(props: IconProps) {
  return <Icon {...props}><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.4-2-.7-1.2.3-2.6 1.8-2.6H17a4 4 0 0 0 4-4C21 7.2 17 3 12 3Z"/><path d="M8 9.5h.01M12 7h.01M16 9h.01M8.5 14h.01"/></Icon>
}

export function Spinner({size = 18}: {size?: number}) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeOpacity=".2" strokeWidth="2"/>
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
