'use client'

import * as Lucide from 'lucide-react'

export function GameIcon({ name, className }: { name: string; className?: string }) {
  const icons = Lucide as unknown as Record<string, Lucide.LucideIcon>
  const Icon = icons[name] ?? Lucide.Circle
  return <Icon className={className} aria-hidden />
}
