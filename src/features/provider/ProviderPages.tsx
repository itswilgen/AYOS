import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, CheckCircle2, Clock3, Image as ImageIcon, MapPin, Plus, ShieldCheck, Star, Trash2, Upload, UserRound, Users, Wrench } from 'lucide-react'
import { apiRequest } from '../../lib/api/client'
import { providerWorkspaceService } from '../../services/provider.service'
import type { JobStatus, ProviderJob, ProviderRequest, ProviderServiceArea } from '../../types/provider'
import { useProviderWorkspace } from './provider-context'
import { useAuth } from '../../lib/auth/useAuth'

const date = (value: string) => new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const time = (value: string) => new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
const dateTime = (value: string) => `${date(value)} · ${time(value)}`
const dayKey = (value: string) => new Date(value).toDateString()
const localInputValue = (value: string | null) => {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const jobStatus: Record<JobStatus, string> = {
  accepted: 'Accepted', scheduled: 'Scheduled', in_progress: 'In progress', provider_finished: 'Awaiting customer confirmation', completed: 'Completed', cancelled: 'Cancelled',
}
const jobSteps: JobStatus[] = ['accepted', 'scheduled', 'in_progress', 'provider_finished', 'completed']

function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="provider-page-heading"><div><span className="provider-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>
}
function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`provider-panel ${className}`}>{title && <div className="provider-panel-head"><h2>{title}</h2>{action}</div>}{children}</section>
}
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="provider-empty"><span><ClipboardIcon /></span><h3>{title}</h3><p>{detail}</p>{action}</div>
}
function ClipboardIcon() { return <Wrench size={22} aria-hidden="true" /> }
function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'muted' }) { return <span className={`provider-pill provider-pill-${tone}`}>{children}</span> }
function RequestCard({ request, actions = false }: { request: ProviderRequest; actions?: boolean }) {
  return <article className="provider-request-card"><div className="provider-request-card-top"><div><span className="provider-card-kicker">CUSTOMER REQUEST · {date(request.createdAt)}</span><h3>{request.service}</h3></div><Pill tone={request.status === 'new' ? 'amber' : request.status === 'accepted' ? 'green' : 'muted'}>{request.status === 'new' ? 'New' : request.status === 'accepted' ? 'Accepted' : 'Declined'}</Pill></div><p>{request.description}</p><div className="provider-card-meta"><span><Users size={16} aria-hidden="true" /> {request.customerName}</span><span><MapPin size={16} aria-hidden="true" /> {request.approximateLocation}</span><span><CalendarDays size={16} aria-hidden="true" /> Preferred {dateTime(request.preferredAt)}</span>{request.photos.length > 0 && <span><ImageIcon size={16} aria-hidden="true" /> {request.photos.length} photo</span>}</div>{actions && <Link className="provider-text-link" to={`/provider/requests/${request.id}`}>View request <ArrowRight size={17} aria-hidden="true" /></Link>}</article>
}
function JobCard({ job }: { job: ProviderJob }) {
  return <article className="provider-job-card"><div className="provider-job-date"><strong>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString('en-PH', { day: '2-digit' }) : '—'}</strong><span>{job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString('en-PH', { month: 'short' }) : 'Set date'}</span></div><div className="provider-job-copy"><span className="provider-card-kicker">{job.customerName} · {job.approximateLocation}</span><h3>{job.service}</h3><p>{job.scheduledAt ? time(job.scheduledAt) : 'Schedule this job with your customer'}</p></div><div className="provider-job-end"><Pill tone={job.status === 'completed' ? 'green' : job.status === 'in_progress' ? 'amber' : 'blue'}>{jobStatus[job.status]}</Pill><Link to={`/provider/jobs/${job.id}`}>Details <ArrowRight size={16} aria-hidden="true" /></Link></div></article>
}

export function ProviderOverview() {
  const { data, busy, run } = useProviderWorkspace()
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name.trim().split(/\s+/)[0] || 'there'
  const newRequests = data.requests.filter((item) => item.status === 'new')
  const upcoming = data.jobs.filter((item) => item.status === 'accepted' || item.status === 'scheduled')
  const active = data.jobs.filter((item) => item.status === 'in_progress' || item.status === 'provider_finished')
  const completed = data.jobs.filter((item) => item.status === 'completed')
  const today = data.jobs.filter((item) => item.scheduledAt && dayKey(item.scheduledAt) === new Date().toDateString() && !['completed', 'cancelled'].includes(item.status))
  const rating = data.reviews.length ? (data.reviews.reduce((sum, item) => sum + item.rating, 0) / data.reviews.length).toFixed(1) : '—'
  const accessPaused = data.access.kind === 'trial' && data.access.successfulClients >= data.access.limit
  const canReceive = data.acceptingRequests && !accessPaused
  return <>
    <Heading eyebrow="YOUR WORKSPACE" title={`${greeting}, ${firstName}`} description="Here’s what’s happening with your services today." action={<Link className="provider-button provider-button-primary" to="/provider/requests">View requests <ArrowRight size={17} /></Link>} />
    <div className="provider-overview-banner"><div><span className="provider-eyebrow">PROVIDER STATUS</span><h2>{canReceive ? 'Ready for new customers' : accessPaused ? 'New opportunities paused' : 'Not receiving new requests'}</h2><p>{accessPaused ? 'Your free client quota is complete. Existing jobs and your customer account remain available.' : 'Your profile and service areas help local customers find the right support.'}</p></div><div className="provider-status-side"><Pill tone={canReceive ? 'green' : 'amber'}>{canReceive ? 'Active' : 'Paused'}</Pill><span><ShieldCheck size={17} aria-hidden="true" /> {data.profile.verified ? 'Identity verified' : 'Verification pending'}</span><label className="provider-switch"><input type="checkbox" checked={data.acceptingRequests} disabled={busy || accessPaused} onChange={(event) => void run((id, name) => providerWorkspaceService.setAcceptingRequests(id, name, event.target.checked), event.target.checked ? 'You are receiving new opportunities.' : 'New opportunities are paused.')} /><span>Receive requests</span></label></div></div>
    <div className="provider-stat-grid"><Link to="/provider/requests"><span>New requests</span><strong>{newRequests.length}</strong><small>Awaiting your reply</small></Link><Link to="/provider/jobs"><span>Upcoming jobs</span><strong>{upcoming.length}</strong><small>Accepted or scheduled</small></Link><Link to="/provider/jobs"><span>Jobs in progress</span><strong>{active.length}</strong><small>Including work awaiting confirmation</small></Link><Link to="/provider/reviews"><span>Completed services</span><strong>{completed.length}</strong><small>Rating {rating} from {data.reviews.length} reviews</small></Link></div>
    <div className="provider-overview-grid"><Panel title="New customer requests" action={<Link to="/provider/requests">See all <ArrowRight size={15} /></Link>}>{newRequests.length ? <div className="provider-compact-list">{newRequests.slice(0, 2).map((item) => <Link to={`/provider/requests/${item.id}`} key={item.id}><span className="provider-list-icon"><Wrench size={19} /></span><span><strong>{item.service}</strong><small>{item.approximateLocation}</small></span><ArrowRight size={17} /></Link>)}</div> : <Empty title="No new requests" detail="Matching customer opportunities will appear here." />}</Panel><Panel title="Today’s schedule" action={<Link to="/provider/schedule">Full schedule <ArrowRight size={15} /></Link>}>{today.length ? <div className="provider-timeline">{today.sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime()).map((item) => <Link to={`/provider/jobs/${item.id}`} key={item.id}><time>{item.scheduledAt && time(item.scheduledAt)}</time><span><strong>{item.service}</strong><small>{item.approximateLocation}</small></span></Link>)}</div> : <Empty title="No jobs today" detail="Scheduled services for today will appear here." />}</Panel></div>
    <div className="provider-access-strip"><div><span className="provider-eyebrow">YOUR PROVIDER ACCESS</span><strong>{data.access.kind === 'lifetime' ? 'Lifetime access active' : `${data.access.successfulClients} of ${data.access.limit} free successful clients used`}</strong><p>{data.access.kind === 'lifetime' ? 'You can continue receiving standard customer opportunities.' : 'Only customer-confirmed completed services count toward your quota.'}</p></div><Link to="/provider/access">View access <ArrowRight size={17} /></Link></div>
  </>
}

export function ProviderRequests() {
  const { data } = useProviderWorkspace()
  const [filter, setFilter] = useState<'new' | 'accepted' | 'declined'>('new')
  const requests = data.requests.filter((item) => item.status === filter)
  return <><Heading eyebrow="CUSTOMER OPPORTUNITIES" title="Requests" description="Review the work customers need before deciding what to take on." /><div className="provider-tabs" role="group" aria-label="Filter requests">{(['new', 'accepted', 'declined'] as const).map((status) => <button key={status} type="button" className={filter === status ? 'is-active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'new' ? 'New' : status === 'accepted' ? 'Accepted' : 'Declined'} <span>{data.requests.filter((item) => item.status === status).length}</span></button>)}</div>{requests.length ? <div className="provider-card-stack">{requests.map((item) => <RequestCard key={item.id} request={item} actions />)}</div> : <Panel><Empty title={`No ${filter} requests`} detail={filter === 'new' ? 'We’ll show matching customer opportunities here when they become available.' : 'Requests in this state will appear here.'} /></Panel>}<p className="provider-privacy-note"><ShieldCheck size={16} aria-hidden="true" /> Exact customer addresses are hidden until the appropriate booking stage.</p></>
}

export function ProviderRequestDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, busy, run } = useProviderWorkspace()
  const request = data.requests.find((item) => item.id === id)
  if (!request) return <Panel><Empty title="Request not found" detail="It may have been removed or is no longer available." action={<Link to="/provider/requests" className="provider-button">Back to requests</Link>} /></Panel>
  const accept = async () => { if (await run((userId, name) => providerWorkspaceService.acceptRequest(userId, name, request.id), 'Request accepted. Add a schedule when you agree on a time.')) navigate('/provider/jobs') }
  const decline = async () => { if (await run((userId, name) => providerWorkspaceService.declineRequest(userId, name, request.id), 'Request declined.')) navigate('/provider/requests') }
  return <><Link className="provider-back" to="/provider/requests"><ArrowLeft size={17} /> All requests</Link><Heading eyebrow={`REQUEST ${request.id.toUpperCase()}`} title={request.service} description={`From ${request.customerName} · Received ${dateTime(request.createdAt)}`} action={<Pill tone={request.status === 'new' ? 'amber' : 'green'}>{request.status === 'new' ? 'Needs a response' : request.status}</Pill>} /><div className="provider-detail-grid"><Panel title="About this request"><h3 className="provider-detail-label">Problem description</h3><p className="provider-detail-copy">{request.description}</p><h3 className="provider-detail-label">Customer notes</h3><p className="provider-detail-copy">{request.notes || 'No additional notes.'}</p><h3 className="provider-detail-label">Customer photos</h3>{request.photos.length ? <div className="provider-photo-grid">{request.photos.map((photo) => <a key={photo} href={photo} target="_blank" rel="noreferrer"><img src={photo} alt={`Sample reference for ${request.service}`} /><span>Open image</span></a>)}</div> : <p className="provider-detail-copy">No photos attached.</p>}</Panel><div className="provider-detail-aside"><Panel title="Visit details"><dl className="provider-detail-list"><div><dt><MapPin size={17} /> Approximate area</dt><dd>{request.approximateLocation}</dd></div><div><dt><Clock3 size={17} /> Preferred time</dt><dd>{dateTime(request.preferredAt)}</dd></div><div><dt><Users size={17} /> Customer</dt><dd>{request.customerName}</dd></div></dl><p className="provider-privacy-note">The customer’s exact address is not shown at this stage.</p></Panel>{request.status === 'new' && <Panel title="Your response"><p className="provider-muted">Accept only when this service fits your skills and availability.</p><div className="provider-action-row"><button className="provider-button provider-button-primary" type="button" disabled={busy} onClick={() => void accept()}>Accept request</button><button className="provider-button" type="button" disabled={busy} onClick={() => void decline()}>Decline</button></div></Panel>}</div></div></>
}

export function ProviderJobs() {
  const { data } = useProviderWorkspace()
  const [filter, setFilter] = useState<'active' | 'upcoming' | 'completed' | 'cancelled'>('active')
  const filters: Record<typeof filter, JobStatus[]> = { active: ['in_progress', 'provider_finished'], upcoming: ['accepted', 'scheduled'], completed: ['completed'], cancelled: ['cancelled'] }
  const jobs = data.jobs.filter((item) => filters[filter].includes(item.status))
  return <><Heading eyebrow="SERVICE WORK" title="My Jobs" description="Follow each job from acceptance through customer confirmation." /><div className="provider-tabs" role="group" aria-label="Filter jobs">{(['active', 'upcoming', 'completed', 'cancelled'] as const).map((status) => <button key={status} type="button" className={filter === status ? 'is-active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status[0].toUpperCase() + status.slice(1)} <span>{data.jobs.filter((item) => filters[status].includes(item.status)).length}</span></button>)}</div>{jobs.length ? <div className="provider-card-stack">{jobs.map((item) => <JobCard key={item.id} job={item} />)}</div> : <Panel><Empty title={`No ${filter} jobs`} detail={filter === 'active' ? 'Accepted customer requests will appear here once work starts.' : 'Jobs in this stage will appear here.'} /></Panel>}</>
}

export function ProviderJobDetails() {
  const { id } = useParams()
  const { data, busy, run } = useProviderWorkspace()
  const job = data.jobs.find((item) => item.id === id)
  const [schedule, setSchedule] = useState(localInputValue(job?.scheduledAt ?? null))
  if (!job) return <Panel><Empty title="Job not found" detail="This job is not in your workspace." action={<Link to="/provider/jobs" className="provider-button">Back to jobs</Link>} /></Panel>
  const stepIndex = jobSteps.indexOf(job.status)
  const saveSchedule = (event: FormEvent) => { event.preventDefault(); void run((userId, name) => providerWorkspaceService.scheduleJob(userId, name, job.id, new Date(schedule).toISOString()), 'Job scheduled.') }
  return <><Link className="provider-back" to="/provider/jobs"><ArrowLeft size={17} /> My Jobs</Link><Heading eyebrow={`JOB ${job.id.toUpperCase()}`} title={job.service} description={`${job.customerName} · ${job.approximateLocation}`} action={<Pill tone={job.status === 'completed' ? 'green' : job.status === 'in_progress' ? 'amber' : 'blue'}>{jobStatus[job.status]}</Pill>} /><div className="provider-detail-grid"><Panel title="Job progress"><ol className="provider-steps">{jobSteps.map((step, index) => <li key={step} className={index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''}><span>{index < stepIndex ? <Check size={16} /> : index + 1}</span><div><strong>{step === 'provider_finished' ? 'Customer confirmation' : jobStatus[step]}</strong><small>{step === 'provider_finished' ? 'Provider has finished; customer confirmation is pending.' : step === 'completed' ? 'Only confirmed services count toward quota.' : ''}</small></div></li>)}</ol></Panel><div className="provider-detail-aside"><Panel title="Visit information"><dl className="provider-detail-list"><div><dt><CalendarDays size={17} /> Scheduled visit</dt><dd>{job.scheduledAt ? dateTime(job.scheduledAt) : 'Not scheduled yet'}</dd></div><div><dt><MapPin size={17} /> Service address</dt><dd>{job.address || job.approximateLocation}</dd></div><div><dt><Users size={17} /> Customer</dt><dd>{job.customerName}</dd></div></dl></Panel>{job.status === 'accepted' && <Panel title="Schedule this job"><form className="provider-form" onSubmit={saveSchedule}><label>Agreed visit date and time<input required type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} /></label><button className="provider-button provider-button-primary" disabled={busy || !schedule} type="submit">Save schedule</button></form></Panel>}{job.status === 'scheduled' && <Panel title="Ready to begin?"><p className="provider-muted">Start the job when you begin the agreed work.</p><button className="provider-button provider-button-primary" disabled={busy} onClick={() => void run((userId, name) => providerWorkspaceService.startJob(userId, name, job.id), 'Job is in progress.')}>Start job</button></Panel>}{job.status === 'in_progress' && <Panel title="Work complete?"><p className="provider-muted">Mark your work finished. The job stays open until the customer confirms it.</p><button className="provider-button provider-button-primary" disabled={busy} onClick={() => void run((userId, name) => providerWorkspaceService.finishJob(userId, name, job.id), 'Work marked finished. Customer confirmation is pending.')}>Mark work finished</button></Panel>}{job.status === 'provider_finished' && <Panel title="Waiting for confirmation"><p className="provider-muted">The customer will confirm completion from their account. This job stays open until then.</p></Panel>}</div></div></>
}

export function ProviderSchedule() {
  const { data } = useProviderWorkspace()
  const scheduled = data.jobs.filter((item) => item.scheduledAt && !['completed', 'cancelled'].includes(item.status)).sort((a, b) => new Date(a.scheduledAt || '').getTime() - new Date(b.scheduledAt || '').getTime())
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7)
  const sections = [
    { title: 'Today', items: scheduled.filter((item) => item.scheduledAt && dayKey(item.scheduledAt) === today.toDateString()) },
    { title: 'Tomorrow', items: scheduled.filter((item) => item.scheduledAt && dayKey(item.scheduledAt) === tomorrow.toDateString()) },
    { title: 'Later this week', items: scheduled.filter((item) => item.scheduledAt && new Date(item.scheduledAt) > tomorrow && new Date(item.scheduledAt) <= weekEnd && dayKey(item.scheduledAt) !== tomorrow.toDateString()) },
  ]
  return <><Heading eyebrow="PLAN YOUR WEEK" title="Schedule" description="A simple list of agreed visits and the work coming up." />{sections.map((section) => <Panel key={section.title} title={section.title} className="provider-schedule-panel">{section.items.length ? <div className="provider-timeline">{section.items.map((job) => <Link key={job.id} to={`/provider/jobs/${job.id}`}><time>{job.scheduledAt && time(job.scheduledAt)}</time><span><strong>{job.service}</strong><small>{job.customerName} · {job.approximateLocation}</small></span><ArrowRight size={17} /></Link>)}</div> : <p className="provider-quiet">No visits planned for {section.title.toLowerCase()}.</p>}</Panel>)}<p className="provider-privacy-note"><CalendarDays size={16} /> Accepted jobs without an agreed time appear in <Link to="/provider/jobs">My Jobs</Link>.</p></>
}

export function ProviderServices() {
  const { data, busy, run } = useProviderWorkspace()
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [optionsError, setOptionsError] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  useEffect(() => { let active = true; void apiRequest<{ data: { id: number; name: string }[] }>('/service-categories').then((result) => { if (active) setCategories(result.data) }).catch(() => { if (active) setOptionsError(true) }); return () => { active = false } }, [])
  const startEdit = (item: typeof data.services[number]) => { setEditing(item.id); setCategory(item.category); setDescription(item.description) }
  const save = async (event: FormEvent) => { event.preventDefault(); if (await run((id, name) => providerWorkspaceService.saveService(id, name, { id: editing || undefined, category, description }), editing ? 'Service updated.' : 'Service added.')) { setEditing(null); setCategory(''); setDescription('') } }
  return <><Heading eyebrow="YOUR OFFERINGS" title="My Services" description="Keep your offered services accurate so the right customers can find you." /><div className="provider-detail-grid"><Panel title="Offered services">{data.services.length ? <div className="provider-setting-list">{data.services.map((item) => <div key={item.id}><span className="provider-list-icon"><Wrench size={19} /></span><div><strong>{item.category}</strong><small>{item.description || 'No description yet'}</small></div><Pill tone={item.active ? 'green' : 'muted'}>{item.active ? 'Active' : 'Disabled'}</Pill><button type="button" onClick={() => startEdit(item)}>Edit</button><button type="button" disabled={busy} onClick={() => void run((id, name) => providerWorkspaceService.toggleService(id, name, item.id), item.active ? 'Service disabled.' : 'Service activated.')}>{item.active ? 'Disable' : 'Enable'}</button></div>)}</div> : <Empty title="No services yet" detail="Add your first service to describe the work you offer." />}</Panel><Panel title={editing ? 'Edit service' : 'Add a service'}><form className="provider-form" onSubmit={save}><label>Service category<select required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Choose a category</option>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}{editing && !categories.some((item) => item.name === category) && <option value={category}>{category}</option>}</select></label>{optionsError && <p className="provider-inline-warning">Categories could not load. Try again later.</p>}<label>What you do<textarea rows={4} maxLength={240} placeholder="Describe the work customers can request" value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="provider-action-row"><button className="provider-button provider-button-primary" disabled={busy || !category || optionsError} type="submit">{editing ? 'Save service' : 'Add service'}</button>{editing && <button type="button" className="provider-button" onClick={() => { setEditing(null); setCategory(''); setDescription('') }}>Cancel</button>}</div></form></Panel></div></>
}

export function ProviderAreas() {
  const { data, busy, run } = useProviderWorkspace()
  const [options, setOptions] = useState<{ region: string; province: string; cities: string[] }[]>([])
  const [optionsError, setOptionsError] = useState(false)
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [barangay, setBarangay] = useState('')
  const [barangays, setBarangays] = useState<string[]>([])
  useEffect(() => { let active = true; void providerWorkspaceService.getAreaOptions().then((items) => { if (active) setOptions(items) }).catch(() => { if (active) setOptionsError(true) }); return () => { active = false } }, [])
  const selection = options.find((item) => item.region === region && item.province === province)
  useEffect(() => { if (!city) return; let active = true; void providerWorkspaceService.getAreaBarangays(region, province, city).then((items) => { if (active) setBarangays(items) }).catch(() => { if (active) setBarangays([]) }); return () => { active = false } }, [region, province, city])
  const save = async (event: FormEvent) => { event.preventDefault(); if (await run((id, name) => providerWorkspaceService.addArea(id, name, { region, province, city, barangay }), 'Service area added.')) { setCity(''); setBarangay('') } }
  return <><Heading eyebrow="WHERE YOU WORK" title="Service Areas" description="List the towns where you accept jobs. Your residential address stays private." /><div className="provider-detail-grid"><Panel title="Your coverage">{data.areas.length ? <div className="provider-setting-list">{data.areas.map((area: ProviderServiceArea) => <div key={area.id}><span className="provider-list-icon"><MapPin size={19} /></span><div><strong>{area.city}{area.barangay ? ` · ${area.barangay}` : ''}</strong><small>{area.province} · {area.region}</small></div><Pill tone="green">Active</Pill><button type="button" disabled={busy} className="provider-remove" onClick={() => void run((id, name) => providerWorkspaceService.removeArea(id, name, area.id), 'Service area removed.')}><Trash2 size={16} /> Remove</button></div>)}</div> : <Empty title="No service areas" detail="Add a city or municipality where you can take customer jobs." />}</Panel><Panel title="Add service area"><form className="provider-form" onSubmit={save}><label>Region<select required value={region} onChange={(event) => { const next = options.find((item) => item.region === event.target.value); setRegion(event.target.value); setProvince(next?.province || ''); setCity('') }}><option value="">Choose a region</option>{Array.from(new Set(options.map((item) => item.region))).map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Province <span>Optional in some regions</span><select value={province} onChange={(event) => { setProvince(event.target.value); setCity('') }}><option value="">Choose a province</option>{options.filter((item) => item.region === region).map((item) => <option key={item.province || 'none'} value={item.province}>{item.province || 'No province'}</option>)}</select></label><label>City or municipality<select required value={city} onChange={(event) => setCity(event.target.value)}><option value="">Choose a city</option>{selection?.cities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>Barangay <span>Optional</span><select value={barangay} onChange={(event) => setBarangay(event.target.value)}><option value="">Whole city or municipality</option>{(city ? barangays : []).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{optionsError && <p className="provider-inline-warning">Location options could not load. Try again later.</p>}<button className="provider-button provider-button-primary" type="submit" disabled={busy || !city || optionsError}><Plus size={17} /> Add area</button></form></Panel></div><p className="provider-privacy-note"><ShieldCheck size={16} /> Service areas describe where you work. They are separate from your home address.</p></>
}

export function ProviderReviews() {
  const { data } = useProviderWorkspace()
  const [ratingFilter, setRatingFilter] = useState<'all' | 5 | 4 | 3 | 2 | 1>('all')
  const reviews = data.reviews.filter((item) => ratingFilter === 'all' || item.rating === ratingFilter)
  const average = data.reviews.length ? (data.reviews.reduce((sum, item) => sum + item.rating, 0) / data.reviews.length).toFixed(1) : '—'
  const completed = data.jobs.filter((item) => item.status === 'completed').length
  return <><Heading eyebrow="YOUR REPUTATION" title="Reviews" description="See how customers experienced your work." /><div className="provider-review-summary"><div><Star size={24} fill="currentColor" /><strong>{average}</strong><span>Overall rating</span></div><div><strong>{data.reviews.length}</strong><span>Reviews</span></div><div><strong>{completed}</strong><span>Completed services</span></div></div><div className="provider-tabs" role="group" aria-label="Filter reviews">{(['all', 5, 4, 3, 2, 1] as const).map((rating) => <button key={rating} type="button" className={ratingFilter === rating ? 'is-active' : ''} aria-pressed={ratingFilter === rating} onClick={() => setRatingFilter(rating)}>{rating === 'all' ? 'All reviews' : `${rating} stars`}</button>)}</div>{reviews.length ? <div className="provider-card-stack">{reviews.map((item) => <article className="provider-review" key={item.id}><div><span aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={16} fill={index < item.rating ? 'currentColor' : 'none'} />)}</span><time>{date(item.date)}</time></div><p>{item.comment}</p><small>{item.service} · {item.customerName}</small></article>)}</div> : <Panel><Empty title="No reviews here yet" detail={ratingFilter === 'all' ? 'Customer reviews will appear after services are completed and rated.' : 'Try another star rating or view all reviews.'} /></Panel>}</>
}

function readImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2_000_000) return Promise.reject(new Error('Choose a JPEG, PNG, or WebP image smaller than 2 MB.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('This image could not be opened.'))
    reader.onerror = () => reject(new Error('This image could not be opened.'))
    reader.readAsDataURL(file)
  })
}

export function ProviderProfilePage() {
  const { data, busy, run } = useProviderWorkspace()
  const [displayName, setDisplayName] = useState(data.profile.displayName)
  const [bio, setBio] = useState(data.profile.bio)
  const [yearsExperience, setYearsExperience] = useState(String(data.profile.yearsExperience))
  const [portfolioTitle, setPortfolioTitle] = useState('')
  const [portfolioCategory, setPortfolioCategory] = useState('')
  const [portfolioImage, setPortfolioImage] = useState('')
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const save = (event: FormEvent) => { event.preventDefault(); void run((id, name) => providerWorkspaceService.saveProfile(id, name, { displayName, bio, yearsExperience: Number(yearsExperience) }), 'Profile saved.') }
  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileError('')
    try { await readImage(file); await run((id, name) => providerWorkspaceService.setProfilePhoto(id, name, file), 'Profile photo updated.') }
    catch (cause) { setFileError(cause instanceof Error ? cause.message : 'Could not open that image.') }
    event.target.value = ''
  }
  const selectWork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileError('')
    try { setPortfolioImage(await readImage(file)); setPortfolioFile(file) }
    catch (cause) { setFileError(cause instanceof Error ? cause.message : 'Could not open that image.') }
    event.target.value = ''
  }
  const addWork = async (event: FormEvent) => { event.preventDefault(); if (!portfolioFile) { setFileError('Choose a work image first.'); return } if (await run((id, name) => providerWorkspaceService.addPortfolioItem(id, name, { title: portfolioTitle.trim(), category: portfolioCategory.trim(), image: portfolioFile }), 'Work sample added.')) { setPortfolioTitle(''); setPortfolioCategory(''); setPortfolioImage(''); setPortfolioFile(null) } }
  return <><Heading eyebrow="PUBLIC PROVIDER IDENTITY" title="Profile" description="Show customers what you do and the experience you bring." /><div className="provider-detail-grid"><Panel title="Professional details"><div className="provider-profile-intro"><span className="provider-profile-photo">{data.profile.photo ? <img src={data.profile.photo} alt="Your profile" /> : <UserRound size={29} aria-hidden="true" />}</span><div><strong>{data.profile.displayName}</strong><small>{data.profile.verified ? <><ShieldCheck size={15} /> Identity verified</> : 'Verification pending'}</small><label className="provider-upload-link"><Upload size={16} /> Change photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event)} /></label></div></div><form className="provider-form" onSubmit={save}><label>Provider display name<input required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Professional bio<textarea rows={5} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Briefly describe your skills and experience" /></label><label>Years of experience<input type="number" min="0" max="70" required value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} /></label><button className="provider-button provider-button-primary" type="submit" disabled={busy}>Save profile</button></form><p className="provider-privacy-note"><ShieldCheck size={16} /> Your residential address and identity documents are never part of this public profile.</p></Panel><div className="provider-detail-aside"><Panel title="At a glance"><dl className="provider-detail-list"><div><dt>Services</dt><dd>{data.services.filter((item) => item.active).map((item) => item.category).join(', ') || 'None yet'}</dd></div><div><dt>Service areas</dt><dd>{data.areas.map((item) => item.city).join(', ') || 'None yet'}</dd></div><div><dt>Verification</dt><dd>{data.profile.verified ? 'Identity verified' : 'Pending'}</dd></div></dl><div className="provider-link-pair"><Link to="/provider/services">Edit services <ArrowRight size={15} /></Link><Link to="/provider/service-areas">Edit coverage <ArrowRight size={15} /></Link></div></Panel></div></div><Panel title="Work portfolio" className="provider-portfolio-panel"><p className="provider-muted">Show examples of completed work. Uploaded images appear on your public provider profile.</p>{data.profile.portfolio.length ? <div className="provider-portfolio-grid">{data.profile.portfolio.map((item) => <article key={item.id}><a href={item.image} target="_blank" rel="noreferrer" aria-label={`Preview ${item.title}`}><img src={item.image} alt={item.title} /><span>Preview work</span></a><div><small>{item.category}</small><strong>{item.title}</strong><button type="button" disabled={busy} onClick={() => void run((id, name) => providerWorkspaceService.removePortfolioItem(id, name, item.id), 'Work sample removed.')}><Trash2 size={15} /> Remove</button></div></article>)}</div> : <Empty title="No work samples" detail="Add an example of the work you have done." />}<form className="provider-form provider-portfolio-form" onSubmit={(event) => void addWork(event)}><h3>Add work sample</h3><label>Project title<input required maxLength={70} value={portfolioTitle} onChange={(event) => setPortfolioTitle(event.target.value)} placeholder="e.g. Residential wiring" /></label><label>Service category<input required maxLength={50} value={portfolioCategory} onChange={(event) => setPortfolioCategory(event.target.value)} placeholder="e.g. Electrical" /></label><label className="provider-file-input">Work image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectWork(event)} /></label>{portfolioImage && <img className="provider-image-preview" src={portfolioImage} alt="New work sample preview" />}{fileError && <p className="provider-inline-warning" role="alert">{fileError}</p>}<button className="provider-button provider-button-primary" type="submit" disabled={busy || !portfolioImage}><Upload size={17} /> Add work</button></form></Panel></>
}

export function ProviderAccessPage() {
  const { data, busy, run } = useProviderWorkspace()
  const [reference, setReference] = useState('')
  const access = data.access
  const remaining = Math.max(0, access.limit - access.successfulClients)
  const percentage = Math.min(100, Math.round(access.successfulClients / access.limit * 100))
  const submitReference = async (event: FormEvent) => {
    event.preventDefault()
    if (await run(() => providerWorkspaceService.submitActivationPayment(reference.trim()), 'Payment reference submitted for AYOS review.')) setReference('')
  }
  return <><Heading eyebrow="PROVIDER ACCESS" title="Quota & Access" description="Understand when new customer opportunities are available to you." /><div className="provider-detail-grid"><Panel title={access.kind === 'lifetime' ? 'Lifetime provider access' : 'Free client access'} className="provider-access-panel">{access.kind === 'lifetime' ? <div className="provider-access-lifetime"><CheckCircle2 size={38} /><h3>Lifetime access active</h3><p>You can continue receiving standard customer opportunities.</p></div> : <><div className="provider-quota-number"><strong>{access.successfulClients} <span>/ {access.limit}</span></strong><p>Successfully completed clients</p></div><div className="provider-progress" role="progressbar" aria-label="Successful client quota" aria-valuenow={access.successfulClients} aria-valuemin={0} aria-valuemax={access.limit}><span style={{ width: `${percentage}%` }} /></div>{remaining === 0 ? <div className="provider-quota-message is-warning"><h3>New customer opportunities paused</h3><p>You’ve completed your free successful client quota. Your existing jobs, reviews, profile and customer account remain available.</p></div> : remaining === 1 ? <div className="provider-quota-message is-warning"><h3>Almost at your free client limit</h3><p>After your next successful client, new customer opportunities will pause until lifetime provider access is activated.</p></div> : <p className="provider-quota-message">{remaining} successful clients remaining before new opportunities pause.</p>}<p className="provider-muted">Only completed services confirmed by a customer count toward your quota.</p></>}</Panel><div className="provider-detail-aside"><Panel title="Lifetime activation">{access.activationFee !== null && <div className="provider-activation-fee"><span>Activation fee</span><strong>₱{access.activationFee.toLocaleString('en-PH')}</strong></div>}{access.kind === 'lifetime' ? <p className="provider-muted">Lifetime provider access is active on your account.</p> : !access.activationPaymentsEnabled ? <p className="provider-muted">Lifetime activation is not available right now. Your free provider access remains active.</p> : access.paymentStatus === 'pending' ? <div className="provider-quota-message"><h3>Reference submitted</h3><p>Reference <strong>{access.paymentReference}</strong> is waiting for AYOS to verify it against the receiving account.</p></div> : <><p className="provider-muted">Follow these verified manual payment instructions. AYOS will review the reference before enabling lifetime access.</p><div className="provider-payment-instructions">{access.activationPaymentInstructions}</div>{access.paymentStatus === 'rejected' && <p className="provider-inline-warning">Your previous reference was rejected. Check the payment details and submit a new reference.</p>}<form className="provider-form" onSubmit={event => void submitReference(event)}><label>Payment reference<input required minLength={4} maxLength={120} value={reference} onChange={event => setReference(event.target.value)} placeholder="Enter the transfer reference" /></label><button type="submit" className="provider-button provider-button-primary" disabled={busy}>Submit reference <ArrowRight size={16} /></button></form><p className="provider-privacy-note"><ShieldCheck size={16} /> Do not enter bank login details, passwords or card numbers.</p></>}</Panel></div></div></>
}

export function ProviderNotifications() {
  const { data, busy, run } = useProviderWorkspace()
  const navigate = useNavigate()
  const unread = data.notifications.filter((item) => !item.read).length
  const openNote = async (id: string, href: string) => { if (await run((userId, name) => providerWorkspaceService.markNotificationRead(userId, name, id))) navigate(href) }
  return <><Heading eyebrow="WORKSPACE UPDATES" title="Notifications" description="Important customer, job and access updates in one place." action={unread > 0 && <button type="button" className="provider-button" disabled={busy} onClick={() => void run((id, name) => providerWorkspaceService.markAllNotificationsRead(id, name), 'All notifications marked as read.')}>Mark all as read</button>} />{data.notifications.length ? <Panel><div className="provider-notification-list">{data.notifications.map((item) => <button type="button" key={item.id} className={!item.read ? 'is-unread' : ''} disabled={busy} onClick={() => void openNote(item.id, item.href)}><span className="provider-list-icon"><Bell size={19} /></span><span><strong>{item.title}</strong><small>{item.detail}</small><time>{dateTime(item.createdAt)}</time></span>{!item.read && <i aria-label="Unread" />}<ArrowRight size={17} aria-hidden="true" /></button>)}</div></Panel> : <Panel><Empty title="You’re all caught up" detail="Customer and service updates will appear here." /></Panel>}</>
}
