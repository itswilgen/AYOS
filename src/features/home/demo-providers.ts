import type { ProviderSummary } from '../../types/marketplace'

/** Fictional profiles used only to preview the provider cards when the API is empty. */
export const demoProviders: ProviderSummary[] = [
  {
    id: 'demo-ramos-electrical', displayName: 'Ramos Electrical Services',
    specialties: ['Electrical', 'Solar installation'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.8, reviewCount: 42, completedServices: 68, verificationStatus: 'verified',
    availability: 'available', initials: 'RE', sample: true, photo: '/images/demo-providers/provider-01.jpg',
  },
  {
    id: 'demo-linis-aircare', displayName: 'Linis Aircare & Repair',
    specialties: ['Aircon cleaning', 'Appliance repair'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.9, reviewCount: 31, completedServices: 54, verificationStatus: 'verified',
    availability: 'available', initials: 'LA', sample: true, photo: '/images/demo-providers/provider-02.jpg',
  },
  {
    id: 'demo-bayan-plumbing', displayName: 'Bayan Plumbing & Fixtures',
    specialties: ['Plumbing', 'Water fixtures'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.7, reviewCount: 24, completedServices: 39, verificationStatus: 'unverified',
    availability: 'busy', initials: 'BP', sample: true, photo: '/images/demo-providers/provider-03.jpg',
  },
  {
    id: 'demo-tanjay-woodworks', displayName: 'Tanjay Woodworks',
    specialties: ['Carpentry', 'Furniture repair'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.9, reviewCount: 28, completedServices: 47, verificationStatus: 'verified',
    availability: 'available', initials: 'TW', sample: true, photo: '/images/demo-providers/provider-04.jpg',
  },
  {
    id: 'demo-kauswagan-appliance', displayName: 'Kauswagan Appliance Care',
    specialties: ['Appliance repair', 'Electrical'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.6, reviewCount: 19, completedServices: 33, verificationStatus: 'unverified',
    availability: 'available', initials: 'KA', sample: true, photo: '/images/demo-providers/provider-05.jpg',
  },
  {
    id: 'demo-negros-device-clinic', displayName: 'Negros Device Clinic',
    specialties: ['Phone repair', 'Computer repair'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.8, reviewCount: 36, completedServices: 61, verificationStatus: 'verified',
    availability: 'busy', initials: 'ND', sample: true, photo: '/images/demo-providers/provider-06.jpg',
  },
  {
    id: 'demo-sunwise-solar', displayName: 'Sunwise Solar Services',
    specialties: ['Solar installation', 'Electrical'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.9, reviewCount: 22, completedServices: 41, verificationStatus: 'verified',
    availability: 'available', initials: 'SS', sample: true, photo: '/images/demo-providers/provider-07.jpg',
  },
  {
    id: 'demo-safehome-cctv', displayName: 'SafeHome CCTV & Security',
    specialties: ['CCTV', 'Network & Wi-Fi'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.7, reviewCount: 17, completedServices: 29, verificationStatus: 'unverified',
    availability: 'available', initials: 'SC', sample: true, photo: '/images/demo-providers/provider-08.jpg',
  },
  {
    id: 'demo-negros-network-assist', displayName: 'Negros Network Assist',
    specialties: ['Network & Wi-Fi', 'Computer repair'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.8, reviewCount: 25, completedServices: 44, verificationStatus: 'verified',
    availability: 'offline', initials: 'NA', sample: true, photo: '/images/demo-providers/provider-09.jpg',
  },
  {
    id: 'demo-tugas-home-repair', displayName: 'Tugas Home Repair Team',
    specialties: ['Carpentry', 'Plumbing'], serviceAreaLabel: 'Tanjay City, Negros Oriental',
    rating: 4.6, reviewCount: 15, completedServices: 26, verificationStatus: 'unverified',
    availability: 'available', initials: 'TH', sample: true, photo: '/images/demo-providers/provider-10.jpg',
  },
]
