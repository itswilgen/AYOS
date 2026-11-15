import { MapPin } from 'lucide-react'
import type { AddressFieldsState } from './useAddressFields'
import '../../pages/address-setup.css'

type Props = {
  fields: AddressFieldsState
  /** Prefix for input ids, so two forms on one page never share an id. */
  idPrefix: string
}

/** "Your area" (region → barangay lists) and "Street details" fieldsets, used by account setup and the Home prompt. */
export default function AddressFields({ fields, idPrefix }: Props) {
  const { form, setField, setError, regions, provinces, cities, barangays, provincesLoading, citiesLoading, barangaysLoading, chooseRegion, chooseProvince, chooseCity, areaComplete, areaPreview } = fields
  const id = (name: string) => `${idPrefix}-${name}`

  return <>
    <fieldset className="setup-group">
      <legend><span className="setup-group-index">1</span> Your area</legend>
      <div className="setup-grid">
        <label className="setup-field" htmlFor={id('region')}>
          <span>Region</span>
          <select id={id('region')} required autoComplete="off" value={form.region_code} disabled={!regions.length} onChange={(event) => chooseRegion(event.target.value)}>
            <option value="">Choose a region</option>
            {regions.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>
        <label className="setup-field" htmlFor={id('province')}>
          <span>Province {!provincesLoading && form.region_code && !provinces.length && <small>Not needed here</small>}</span>
          <select id={id('province')} value={form.province_code} disabled={!form.region_code || provincesLoading || !provinces.length} onChange={(event) => chooseProvince(event.target.value)}>
            <option value="">{!form.region_code ? 'Choose a region first' : provincesLoading ? 'Loading provinces…' : provinces.length ? 'Choose a province' : 'No provinces in this region'}</option>
            {provinces.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>
        <label className="setup-field" htmlFor={id('city')}>
          <span>City or municipality</span>
          <select id={id('city')} required value={form.city_municipality_code} disabled={!form.region_code || citiesLoading} onChange={(event) => chooseCity(event.target.value)}>
            <option value="">{!form.region_code ? 'Choose a region first' : citiesLoading ? 'Loading cities…' : 'Choose a city or municipality'}</option>
            {cities.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>
        <label className="setup-field" htmlFor={id('barangay')}>
          <span>Barangay</span>
          <select id={id('barangay')} required value={form.barangay_code} disabled={!form.city_municipality_code || barangaysLoading} onChange={(event) => { setError(''); setField('barangay_code', event.target.value) }}>
            <option value="">{!form.city_municipality_code ? 'Choose a city first' : barangaysLoading ? 'Loading barangays…' : 'Choose a barangay'}</option>
            {barangays.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
          </select>
        </label>
      </div>
      <p className={`setup-area-preview${areaComplete ? ' is-complete' : ''}`} aria-live="polite">
        <MapPin size={16} aria-hidden="true" />
        <span>{areaPreview || 'Your area will appear here as you choose.'}</span>
      </p>
    </fieldset>

    <fieldset className="setup-group">
      <legend><span className="setup-group-index">2</span> Street details</legend>
      <label className="setup-field" htmlFor={id('street')}>
        <span>House no., street, and unit</span>
        <input id={id('street')} name="address_line" autoComplete="street-address" required maxLength={1000} value={form.address_line} onChange={(event) => setField('address_line', event.target.value)} placeholder="e.g. 26 Jesus Street, Unit 2" />
      </label>
      <div className="setup-grid setup-grid-details">
        <label className="setup-field" htmlFor={id('landmark')}>
          <span>Landmark <small>Optional</small></span>
          <input id={id('landmark')} name="landmark" maxLength={500} value={form.landmark} onChange={(event) => setField('landmark', event.target.value)} placeholder="e.g. Beside the chapel, blue gate" />
        </label>
        <label className="setup-field" htmlFor={id('postal')}>
          <span>Postal code <small>Optional</small></span>
          <input id={id('postal')} name="postal_code" autoComplete="postal-code" inputMode="numeric" maxLength={16} value={form.postal_code} onChange={(event) => setField('postal_code', event.target.value)} placeholder="e.g. 6204" />
        </label>
      </div>
    </fieldset>
  </>
}
