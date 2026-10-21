import type {ReactNode} from 'react'
import {BrandIcon} from '../brandIcons'
import {IconAlert, IconCircleCheck, IconCircleX} from '../uiIcons'

export function IconTile({icon, size = 46}: {icon: string; size?: number}) {
  return (
    <span className="icon-tile" style={{width: size, height: size}}>
      <BrandIcon name={icon} size={Math.round(size * 0.52)}/>
    </span>
  )
}

export function SectionHeader({
  index,
  title,
  meta,
  action,
}: {
  index?: string
  title: string
  meta?: string
  action?: ReactNode
}) {
  return (
    <div className="section-header">
      <div className="section-title-wrap">
        {index && <span className="section-index">{index}</span>}
        <h2>{title}</h2>
        {meta && <span className="section-meta">{meta}</span>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  )
}

export function StatusMark({status, size = 16}: {status: 'ok' | 'warn' | 'missing' | string; size?: number}) {
  if (status === 'ok') return <IconCircleCheck size={size} className="status-ok"/>
  if (status === 'warn') return <IconAlert size={size} className="status-warn"/>
  if (status === 'missing') return <IconCircleX size={size} className="status-missing"/>
  return <span className={`status-dot status-${status}`}/>
}

export function StatusLabel({status, children}: {status: string; children: ReactNode}) {
  return (
    <span className={`status-label status-label-${status}`}>
      <span className="status-dot"/>
      {children}
    </span>
  )
}

export function Kbd({children}: {children: ReactNode}) {
  return <kbd className="kbd">{children}</kbd>
}
