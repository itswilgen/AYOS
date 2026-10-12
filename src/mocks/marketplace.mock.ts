import type {
  NotificationSummary,
  ProviderSummary,
  ServiceCategory,
  ServiceRequestSummary,
} from '../types/marketplace'

export const serviceCategories: ServiceCategory[] = [
  { id: 1, slug: 'electrical', name: 'Electrical', shortDescription: 'Wiring, lighting, outlets and troubleshooting.', icon: 'electrical' },
  { id: 2, slug: 'plumbing', name: 'Plumbing', shortDescription: 'Leaks, fixtures, drains and water lines.', icon: 'plumbing' },
  { id: 3, slug: 'carpentry', name: 'Carpentry', shortDescription: 'Repairs, shelves, doors and custom woodwork.', icon: 'carpentry' },
  { id: 4, slug: 'aircon', name: 'Aircon', shortDescription: 'Cleaning, maintenance and repair.', icon: 'aircon' },
  { id: 5, slug: 'appliance-repair', name: 'Appliance repair', shortDescription: 'Help with the appliances you use every day.', icon: 'appliance' },
  { id: 6, slug: 'phone-repair', name: 'Phone repair', shortDescription: 'Screen, battery and device troubleshooting.', icon: 'phone' },
  { id: 7, slug: 'computer-repair', name: 'Computer repair', shortDescription: 'Laptop setup, repair and Wi-Fi support.', icon: 'computer' },
  { id: 8, slug: 'solar', name: 'Solar', shortDescription: 'Home solar installation and maintenance.', icon: 'solar' },
  { id: 9, slug: 'cctv', name: 'CCTV', shortDescription: 'Camera installation and system setup.', icon: 'cctv' },
  { id: 10, slug: 'network-wifi', name: 'Network & Wi-Fi', shortDescription: 'Improve coverage and connect your devices.', icon: 'network' },
]

export const sampleProviders: ProviderSummary[] = [
  {
    id: 'sample-ramos-electrical',
    displayName: 'Ramos Electrical Services',
    specialties: ['Electrical', 'Solar installation'],
    serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.8,
    reviewCount: 42,
    completedServices: 68,
    verificationStatus: 'verified',
    availability: 'available',
    initials: 'RE',
    sample: true,
  },
  {
    id: 'sample-linis-aircare',
    displayName: 'Linis Aircare & Repair',
    specialties: ['Aircon cleaning', 'Appliance repair'],
    serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.9,
    reviewCount: 31,
    completedServices: 54,
    verificationStatus: 'verified',
    availability: 'available',
    initials: 'LA',
    sample: true,
  },
  {
    id: 'sample-bayan-plumbing',
    displayName: 'Bayan Plumbing & Fixtures',
    specialties: ['Plumbing', 'Water fixtures'],
    serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.7,
    reviewCount: 24,
    completedServices: 39,
    verificationStatus: 'unverified',
    availability: 'busy',
    initials: 'BP',
    sample: true,
  },
]

export const sampleRequests: ServiceRequestSummary[] = []
export const sampleNotifications: NotificationSummary[] = []
