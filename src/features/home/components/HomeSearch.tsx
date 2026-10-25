import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { findServiceCategories } from '../../../services/home.service'
import type { ServiceCategory, ServiceLocationSummary } from '../../../types/marketplace'
import { serviceSearchPath } from '../home-links'
import { serviceIcons } from '../service-visuals'

type Props = {
  categories: ServiceCategory[]
  location?: ServiceLocationSummary
}

export default function HomeSearch({ categories, location }: Props) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const suggestions = useMemo(() => findServiceCategories(categories, query).slice(0, 5), [categories, query])
  const expanded = open && suggestions.length > 0
  const activeOption = expanded && activeIndex >= 0 ? suggestions[activeIndex] : undefined

  const search = (service: string) => {
    setOpen(false)
    navigate(serviceSearchPath(service, location))
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const service = query.trim()
    if (service) search(service)
    else inputRef.current?.focus()
  }

  const moveSelection = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const last = suggestions.length - 1
      const down = event.key === 'ArrowDown'
      setOpen(true)
      setActiveIndex((index) => down ? (index >= last ? 0 : index + 1) : (index <= 0 ? last : index - 1))
    } else if (event.key === 'Enter' && activeOption) {
      event.preventDefault()
      search(activeOption.name)
    }
  }

  return <form className="home-search" role="search" aria-label="Find a service" onSubmit={submit}>
    <Search size={20} aria-hidden="true" />
    <label className="sr-only" htmlFor="service-search-input">What needs fixing?</label>
    <input
      ref={inputRef}
      id="service-search-input"
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls="service-suggestions"
      aria-activedescendant={activeOption ? `service-option-${activeOption.id}` : undefined}
      placeholder="Try “aircon cleaning”"
      enterKeyHint="search"
      autoComplete="off"
      value={query}
      onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setOpen(true) }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={moveSelection}
    />
    <Button type="submit">Find help <ArrowRight size={17} aria-hidden="true" /></Button>
    {expanded && <ul className="home-search-suggestions" id="service-suggestions" role="listbox" aria-label="Matching services">
      {suggestions.map((category, index) => {
        const Icon = serviceIcons[category.icon]
        return <li
          key={category.id}
          id={`service-option-${category.id}`}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => search(category.name)}
        >
          <span className="home-suggestion-icon"><Icon size={18} aria-hidden="true" /></span>
          <span><strong>{category.name}</strong><small>{category.shortDescription}</small></span>
          <ArrowRight size={16} aria-hidden="true" />
        </li>
      })}
    </ul>}
  </form>
}
