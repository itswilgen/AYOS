import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../../lib/api/client'
import { locationsService } from '../../services/locations.service'
import type { LocationOption, ServiceLocationSummary } from '../../types/marketplace'

export type AddressForm = {
  region_code: string
  province_code: string
  city_municipality_code: string
  barangay_code: string
  address_line: string
  landmark: string
  postal_code: string
}

const emptyForm: AddressForm = {
  region_code: '', province_code: '', city_municipality_code: '', barangay_code: '', address_line: '', landmark: '', postal_code: '',
}

function formFromLocation(location: ServiceLocationSummary): AddressForm {
  return {
    region_code: location.region.code,
    province_code: location.province?.code ?? '',
    city_municipality_code: location.city_municipality.code,
    barangay_code: location.barangay.code,
    address_line: location.address_line,
    landmark: location.landmark ?? '',
    postal_code: location.postal_code ?? '',
  }
}

/** The first Laravel validation message in an API error, or '' when there is none. */
export function firstValidationError(error: unknown): string {
  if (error instanceof ApiError && typeof error.details === 'object' && error.details !== null && 'errors' in error.details) {
    const errors = error.details.errors
    if (typeof errors === 'object' && errors !== null) {
      const first = Object.values(errors)[0]
      if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    }
  }
  return ''
}

const nameOf = (options: LocationOption[], code: string) => options.find((option) => option.code === code)?.name ?? ''

/**
 * The home-address form: region → province → city → barangay lists that load as each level is chosen,
 * plus the street details. Shared by account setup and the Home address prompt.
 */
export function useAddressFields() {
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [error, setError] = useState('')
  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])
  const [provincesLoading, setProvincesLoading] = useState(false)
  const [citiesLoading, setCitiesLoading] = useState(false)
  const [barangaysLoading, setBarangaysLoading] = useState(false)

  /** Call once the region list (and any saved address to prefill) has loaded. */
  const start = useCallback((regionOptions: LocationOption[], saved?: ServiceLocationSummary | null) => {
    setRegions(regionOptions)
    if (saved) {
      setForm(formFromLocation(saved))
      setProvincesLoading(true)
      setCitiesLoading(true)
      setBarangaysLoading(true)
    }
  }, [])

  useEffect(() => {
    if (!form.region_code) return
    let active = true
    void locationsService.getProvinces(form.region_code)
      .then((items) => {
        if (!active) return
        setProvinces(items)
        if (items.length === 1) {
          setCitiesLoading(true)
          setForm((current) => current.province_code ? current : { ...current, province_code: items[0].code })
        }
      })
      .catch(() => { if (active) setError('Couldn’t load provinces for that region.') })
      .finally(() => { if (active) setProvincesLoading(false) })
    return () => { active = false }
  }, [form.region_code])

  useEffect(() => {
    if (!form.region_code) return
    let active = true
    const request = form.province_code
      ? locationsService.getCities(form.province_code)
      : locationsService.getCitiesInRegion(form.region_code)
    void request
      .then((items) => {
        if (!active) return
        setCities(items)
        if (items.length === 1) {
          setBarangaysLoading(true)
          setForm((current) => current.city_municipality_code ? current : { ...current, city_municipality_code: items[0].code })
        }
      })
      .catch(() => { if (active) setError('Couldn’t load cities for that area.') })
      .finally(() => { if (active) setCitiesLoading(false) })
    return () => { active = false }
  }, [form.region_code, form.province_code])

  useEffect(() => {
    if (!form.city_municipality_code) return
    let active = true
    void locationsService.getBarangays(form.city_municipality_code)
      .then((items) => {
        if (!active) return
        setBarangays(items)
        if (items.length === 1) setForm((current) => current.barangay_code ? current : { ...current, barangay_code: items[0].code })
      })
      .catch(() => { if (active) setError('Couldn’t load barangays for that city.') })
      .finally(() => { if (active) setBarangaysLoading(false) })
    return () => { active = false }
  }, [form.city_municipality_code])

  const chooseRegion = (code: string) => {
    setProvinces([]); setCities([]); setBarangays([])
    setProvincesLoading(Boolean(code)); setCitiesLoading(Boolean(code)); setBarangaysLoading(false)
    setError('')
    setForm((current) => ({ ...current, region_code: code, province_code: '', city_municipality_code: '', barangay_code: '' }))
  }

  const chooseProvince = (code: string) => {
    setCities([]); setBarangays([])
    setCitiesLoading(true); setBarangaysLoading(false)
    setError('')
    setForm((current) => ({ ...current, province_code: code, city_municipality_code: '', barangay_code: '' }))
  }

  const chooseCity = (code: string) => {
    setBarangays([])
    setBarangaysLoading(Boolean(code))
    setError('')
    setForm((current) => ({ ...current, city_municipality_code: code, barangay_code: '' }))
  }

  const setField = (key: keyof AddressForm, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const areaParts = [
    nameOf(barangays, form.barangay_code),
    nameOf(cities, form.city_municipality_code),
    nameOf(provinces, form.province_code),
    nameOf(regions, form.region_code),
  ]

  /** The body for PUT /api/account/address. */
  const payload = () => ({
    label: 'Home',
    region_code: form.region_code,
    province_code: form.province_code || null,
    city_municipality_code: form.city_municipality_code,
    barangay_code: form.barangay_code,
    address_line: form.address_line.trim(),
    landmark: form.landmark.trim() || null,
    postal_code: form.postal_code.trim() || null,
  })

  return {
    form, setField, error, setError, start, payload,
    regions, provinces, cities, barangays,
    provincesLoading, citiesLoading, barangaysLoading,
    optionsLoading: provincesLoading || citiesLoading || barangaysLoading,
    chooseRegion, chooseProvince, chooseCity,
    areaComplete: Boolean(form.region_code && form.city_municipality_code && form.barangay_code),
    areaPreview: areaParts.filter(Boolean).join(', '),
  }
}

export type AddressFieldsState = ReturnType<typeof useAddressFields>
