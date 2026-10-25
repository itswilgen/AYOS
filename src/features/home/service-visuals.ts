import { AirVent, BatteryCharging, Camera, Computer, Drill, Hammer, PlugZap, Smartphone, Wifi, Wrench, type LucideIcon } from 'lucide-react'
import type { ServiceIconKey } from '../../types/marketplace'

export const serviceIcons: Record<ServiceIconKey, LucideIcon> = {
  electrical: PlugZap,
  plumbing: Wrench,
  carpentry: Hammer,
  aircon: AirVent,
  appliance: Drill,
  phone: Smartphone,
  computer: Computer,
  solar: BatteryCharging,
  cctv: Camera,
  network: Wifi,
}

/** Photos for seeded category slugs. Categories added later fall back to their icon. */
export const servicePhotos: Record<string, string> = {
  electrical: '/images/services/electrical.webp',
  plumbing: '/images/services/plumbing.webp',
  carpentry: '/images/services/carpentry.webp',
  aircon: '/images/services/aircon.webp',
  'appliance-repair': '/images/services/appliance-repair.webp',
  'phone-repair': '/images/services/phone-repair.webp',
  'computer-repair': '/images/services/computer-repair.webp',
  solar: '/images/services/solar-installation.webp',
  cctv: '/images/services/cctv-installation.webp',
}
