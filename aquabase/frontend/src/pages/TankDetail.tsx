import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Fish, Leaf, Droplets, CalendarClock, Bell, Pencil, Trash2, Plus, ChevronLeft, Sun, type LucideIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTank, useFish, usePlants, useParameters, useAlerts } from '../hooks'
import { api } from '../api/client'
import { useSettings, formatDate, formatDateTime, fromMM, toMM, fmtDim, dimInputProps } from '../context/SettingsContext'
import { Card, FieldLabel, Tag, SectionTitle, tabStyle } from '../components/ui'

type Tab = 'fish' | 'plants' | 'parameters' | 'schedule' | 'daily' | 'alerts' | 'edit'

const TASK_TYPES = ['Water change', 'Filter clean', 'Fertiliser dose', 'CO2 check', 'Glass clean', 'Gravel vac', 'Other']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HEALTH_STATUSES = ['healthy', 'sick', 'quarantine', 'deceased']
const TAB_ICONS: Record<string, LucideIcon> = {
  fish: Fish,
  plants: Leaf,
  parameters: Droplets,
  schedule: CalendarClock,
  daily: Sun,
  alerts: Bell,
  edit: Pencil,
}

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAILY_COLORS = ['#1e88e5', '#43a047', '#26c6da', '#fb8c00', '#e63946', '#8b5cf6']
const HEALTH_COLORS: Record<string, { bg: string; color: string }> = {
  healthy:    { bg: 'var(--green-bg)',  color: 'var(--green)'  },
  sick:       { bg: 'var(--amber-bg)',  color: 'var(--amber)'  },
  quarantine: { bg: 'var(--blue-bg)',   color: 'var(--blue)'   },
  deceased:   { bg: 'var(--red-bg)',    color: 'var(--red)'    },
}

// --- Species autocomplete ---
function SpeciesAutocomplete({ type, value, onChange }: {
  type: 'fish' | 'plant'
  value: string
  onChange: (slug: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(() => {
      fetch(`/api/species/?type=${type}&search=${encodeURIComponent(query)}`)
        .then(r => r.json()).then(setResults).catch(() => setResults([]))
    }, 200)
    return () => clearTimeout(t)
  }, [query, type])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={query || value}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={`Search ${type} species…`}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface)', border: '0.5px solid var(--btn-border)', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: 220, overflowY: 'auto',
        }}>
          {results.map((s: any) => (
            <div
              key={s.slug}
              className="species-option"
              onMouseDown={() => {
                onChange(s.slug, s.common_name)
                setQuery(s.common_name)
                setOpen(false)
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>{s.common_name}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>{s.latin_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Edit tank panel ---
function EditTankPanel({ tank, onSave }: { tank: any; onSave: () => void }) {
  const { unitSystem } = useSettings()
  const dp = dimInputProps(unitSystem)

  const [name, setName] = useState(tank.name)
  const [volume, setVolume] = useState(String(tank.volume_litres))
  const [substrate, setSubstrate] = useState(tank.substrate ?? '')
  const [lighting, setLighting] = useState(tank.lighting ?? '')
  const [filterFlow, setFilterFlow] = useState(tank.filter_flow_lph != null ? String(tank.filter_flow_lph) : '')
  const [width, setWidth] = useState(tank.width_mm != null ? String(fromMM(tank.width_mm, unitSystem)) : '')
  const [height, setHeight] = useState(tank.height_mm != null ? String(fromMM(tank.height_mm, unitSystem)) : '')
  const [depth, setDepth] = useState(tank.depth_mm != null ? String(fromMM(tank.depth_mm, unitSystem)) : '')
  const [co2, setCo2] = useState(tank.co2_injection)
  const [saved, setSaved] = useState(false)

  async function save() {
    await fetch(`/api/tanks/${tank.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, volume_litres: Number(volume),
        substrate: substrate || null, lighting: lighting || null,
        filter_flow_lph: filterFlow ? Number(filterFlow) : null,
        width_mm: width ? toMM(Number(width), unitSystem) : null,
        height_mm: height ? toMM(Number(height), unitSystem) : null,
        depth_mm: depth ? toMM(Number(depth), unitSystem) : null,
        co2_injection: co2, setup_date: tank.setup_date,
      }),
    })
    onSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <SectionTitle>Edit tank</SectionTitle>
      {[
        ['Tank name', name, setName],
        ['Volume (litres)', volume, setVolume],
        ['Substrate', substrate, setSubstrate],
        ['Lighting', lighting, setLighting],
        ['Filter flow (L/h)', filterFlow, setFilterFlow],
      ].map(([lbl, val, set]) => (
        <div key={lbl as string} style={{ marginBottom: 12 }}>
          <FieldLabel>{lbl as string}</FieldLabel>
          <input value={val as string} onChange={e => (set as any)(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        {([['Width', width, setWidth], ['Height', height, setHeight], ['Depth', depth, setDepth]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
          <div key={lbl}>
            <FieldLabel>{lbl} ({unitSystem})</FieldLabel>
            <input type="number" min="0" step={dp.step} placeholder={dp.placeholder}
              value={val} onChange={e => set(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, color: 'var(--text-label)' }}>
        <input type="checkbox" checked={co2} onChange={e => setCo2(e.target.checked)} /> CO₂ injection
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={save} style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save changes</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved ✓</span>}
      </div>
    </Card>
  )
}

// --- Compatibility badge ---
function CompatibilityCheck({ tankId, slug }: { tankId: string; slug: string }) {
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    if (!slug) { setWarnings([]); return }
    fetch(`/api/tanks/${tankId}/compatibility?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setWarnings(d.warnings ?? []))
      .catch(() => setWarnings([]))
  }, [slug, tankId])

  if (!warnings.length) return null
  return (
    <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)', borderRadius: 8, padding: '8px 12px', marginTop: 8 }}>
      {warnings.map((w, i) => (
        <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0', fontSize: 12, color: 'var(--amber)' }}>⚠ {w}</p>
      ))}
    </div>
  )
}

export default function TankDetail() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>('fish')
  const { data: tank, reload: reloadTank } = useTank(id!)
  const fish = useFish(id!)
  const plants = usePlants(id!)
  const params = useParameters(id!, 100)
  const alerts = useAlerts(id!)
  const { dateFormat, unitSystem } = useSettings()

  const [fishSlug, setFishSlug] = useState('')
  const [fishName, setFishName] = useState('')
  const [fishQty, setFishQty] = useState('1')

  const [editingFishId, setEditingFishId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editHealth, setEditHealth] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [plantSlug, setPlantSlug] = useState('')
  const [plantName, setPlantName] = useState('')
  const [plantQty, setPlantQty] = useState('1')

  const [ph, setPh] = useState('')
  const [temp, setTemp] = useState('')
  const [ammonia, setAmmonia] = useState('')
  const [nitrite, setNitrite] = useState('')
  const [nitrate, setNitrate] = useState('')
  const [gh, setGh] = useState('')
  const [kh, setKh] = useState('')

  const [dailyTasks, setDailyTasks] = useState<any[]>([])
  const [dtName, setDtName] = useState('')
  const [dtHour, setDtHour] = useState('8')
  const [dtMinute, setDtMinute] = useState('0')
  const [dtDays, setDtDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [dtColor, setDtColor] = useState(DAILY_COLORS[0])

  const [tasks, setTasks] = useState<any[]>([])
  const [taskType, setTaskType] = useState(TASK_TYPES[0])
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurWeeks, setRecurWeeks] = useState('1')
  const [recurDay, setRecurDay] = useState('0')

  useEffect(() => {
    if (tab === 'schedule') loadTasks()
    if (tab === 'daily') loadDailyTasks()
  }, [tab, id])

  async function loadDailyTasks() {
    const r = await fetch(`/api/tanks/${id}/daily`)
    setDailyTasks(await r.json())
  }

  async function addDailyTask() {
    if (!dtName.trim() || dtDays.length === 0) return
    await api.dailyTasks.create(id!, {
      name: dtName.trim(),
      hour: Number(dtHour),
      minute: Number(dtMinute),
      days: dtDays.join(','),
      color: dtColor,
    })
    setDtName('')
    setDtDays([0, 1, 2, 3, 4, 5, 6])
    loadDailyTasks()
  }

  async function removeDailyTask(taskId: string) {
    await api.dailyTasks.delete(id!, taskId)
    loadDailyTasks()
  }

  async function loadTasks() {
    const r = await fetch(`/api/tanks/${id}/maintenance`)
    setTasks(await r.json())
  }

  async function addTask() {
    if (!isRecurring && !taskDue) return
    const body: any = { task_type: taskType, description: taskDesc || null }
    if (isRecurring) {
      body.is_recurring = true
      body.recur_every_weeks = Number(recurWeeks)
      body.recur_day_of_week = Number(recurDay)
      body.due_at = new Date().toISOString()
    } else {
      body.due_at = new Date(taskDue).toISOString()
    }
    await fetch(`/api/tanks/${id}/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setTaskDesc(''); setTaskDue(''); setIsRecurring(false); setRecurWeeks('1'); setRecurDay('0')
    loadTasks()
  }

  async function completeTask(taskId: string) {
    await fetch(`/api/tanks/${id}/maintenance/${taskId}/complete`, { method: 'PATCH' })
    loadTasks()
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tanks/${id}/maintenance/${taskId}`, { method: 'DELETE' })
    loadTasks()
  }

  function startEditFish(f: { id: string; quantity: number; health_status: string; notes: string | null }) {
    setEditingFishId(f.id)
    setEditQty(String(f.quantity))
    setEditHealth(f.health_status)
    setEditNotes(f.notes ?? '')
  }

  async function saveEditFish() {
    if (!editingFishId) return
    await api.fish.update(id!, editingFishId, {
      quantity: Number(editQty),
      health_status: editHealth,
      notes: editNotes || null,
    })
    setEditingFishId(null)
    fish.reload()
  }

  const dailyCellMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    dailyTasks.forEach(task => {
      task.days.split(',').map(Number).forEach((day: number) => {
        const key = `${day}-${task.hour}`
        if (!map[key]) map[key] = []
        map[key].push(task)
      })
    })
    return map
  }, [dailyTasks])

  const todayColIndex = (new Date().getDay() + 6) % 7  // JS 0=Sun → 0=Mon

  if (!tank) return <p style={{ color: 'var(--text-2)' }}>Loading…</p>

  const unackAlerts = alerts.data?.filter(a => !a.acknowledged) ?? []
  const chartData = [...(params.data ?? [])].reverse()

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const overdueTasks = pendingTasks.filter(t => new Date(t.due_at) < new Date())

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
          <ChevronLeft size={13} />All tanks
        </Link>
        <div style={{ marginTop: 8 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>{tank.name}</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            {tank.volume_litres}L
            {(tank.width_mm || tank.height_mm || tank.depth_mm) ? ` · ${fmtDim(tank.width_mm, unitSystem)} × ${fmtDim(tank.height_mm, unitSystem)} × ${fmtDim(tank.depth_mm, unitSystem)}` : ''}
            {tank.co2_injection ? ' · CO₂' : ''}
            {tank.substrate ? ` · ${tank.substrate}` : ''}
            {tank.lighting ? ` · ${tank.lighting}` : ''}
            {tank.filter_flow_lph ? ` · ${tank.filter_flow_lph} L/h filter` : ''}
          </p>
        </div>
      </div>

      {unackAlerts.length > 0 && (
        <div style={{ background: 'var(--amber-bg)', border: '0.5px solid var(--amber-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--amber-dark)' }}>
            {unackAlerts.length} unacknowledged alert{unackAlerts.length > 1 ? 's' : ''}
          </p>
          {unackAlerts.slice(0, 2).map(a => (
            <p key={a.id} style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--amber)' }}>{a.message}</p>
          ))}
        </div>
      )}

      {overdueTasks.length > 0 && (
        <div style={{ background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--red-dark)' }}>
            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
          </p>
          {overdueTasks.slice(0, 2).map(t => (
            <p key={t.id} style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--red)' }}>
              {t.task_type}{t.description ? ` — ${t.description}` : ''} (due {formatDate(t.due_at, dateFormat)})
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['fish', 'plants', 'parameters', 'schedule', 'daily', 'alerts', 'edit'] as Tab[]).map(t => {
          const Icon = TAB_ICONS[t]
          return (
            <button key={t} style={{ ...tabStyle(tab === t), display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => setTab(t)}>
              <Icon size={13} />
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'alerts' && unackAlerts.length > 0 && (
                <span style={{ marginLeft: 2, background: '#e24b4a', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>
                  {unackAlerts.length}
                </span>
              )}
              {t === 'schedule' && overdueTasks.length > 0 && (
                <span style={{ marginLeft: 2, background: 'var(--red-border)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>
                  {overdueTasks.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* FISH TAB */}
      {tab === 'fish' && (
        <Card>
          <SectionTitle>Fish</SectionTitle>
          {fish.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No fish added yet.</p>}
          {fish.data?.map(f => {
            const hc = HEALTH_COLORS[f.health_status] ?? HEALTH_COLORS.healthy
            const isEditing = editingFishId === f.id
            return (
              <div key={f.id} style={{ borderBottom: '0.5px solid var(--border-sub)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {f.common_name ?? f.species_slug}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>×{f.quantity}</span>
                    {f.latin_name && (
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{f.latin_name}</p>
                    )}
                    {f.notes && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-2)' }}>{f.notes}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <Tag bg={hc.bg} color={hc.color}>{f.health_status}</Tag>
                    <button
                      onClick={() => isEditing ? setEditingFishId(null) : startEditFish(f)}
                      style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={async () => { await api.fish.remove(id!, f.id); fish.reload() }}
                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} />Remove
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <FieldLabel>Quantity</FieldLabel>
                        <input
                          type="number" min="1" value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <FieldLabel>Health status</FieldLabel>
                        <select
                          value={editHealth}
                          onChange={e => setEditHealth(e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        >
                          {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <FieldLabel>Notes</FieldLabel>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        placeholder="e.g. Hikari micro pellets, twice daily"
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    </div>
                    <button
                      onClick={saveEditFish}
                      style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-label)', margin: '0 0 8px' }}>
              <Plus size={12} />Add fish
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <SpeciesAutocomplete type="fish" value={fishName} onChange={(slug, name) => { setFishSlug(slug); setFishName(name) }} />
              <div>
                <FieldLabel>Qty</FieldLabel>
                <input type="number" value={fishQty} onChange={e => setFishQty(e.target.value)} style={{ width: 60 }} min="1" />
              </div>
              <div style={{ paddingTop: 16 }}>
                <button onClick={async () => {
                  if (!fishSlug) return
                  await api.fish.add(id!, { species_slug: fishSlug, quantity: Number(fishQty), notes: null })
                  setFishSlug(''); setFishName(''); setFishQty('1')
                  fish.reload()
                }}>Add</button>
              </div>
            </div>
            <CompatibilityCheck tankId={id!} slug={fishSlug} />
          </div>
        </Card>
      )}

      {/* PLANTS TAB */}
      {tab === 'plants' && (
        <Card>
          <SectionTitle>Plants</SectionTitle>
          {plants.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No plants added yet.</p>}
          {plants.data?.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border-sub)' }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{p.species_slug} <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>×{p.quantity}</span></span>
              <button onClick={async () => { await api.plants.remove(id!, p.id); plants.reload() }} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={11} />Remove</button>
            </div>
          ))}
          <div style={{ marginTop: 16, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-label)', margin: '0 0 8px' }}>
              <Plus size={12} />Add plant
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <SpeciesAutocomplete type="plant" value={plantName} onChange={(slug, name) => { setPlantSlug(slug); setPlantName(name) }} />
              <div>
                <FieldLabel>Qty</FieldLabel>
                <input type="number" value={plantQty} onChange={e => setPlantQty(e.target.value)} style={{ width: 60 }} min="1" />
              </div>
              <div style={{ paddingTop: 16 }}>
                <button onClick={async () => {
                  if (!plantSlug) return
                  await api.plants.add(id!, { species_slug: plantSlug, quantity: Number(plantQty), notes: null })
                  setPlantSlug(''); setPlantName(''); setPlantQty('1')
                  plants.reload()
                }}>Add</button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* PARAMETERS TAB */}
      {tab === 'parameters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Log parameters</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
              {([['pH', ph, setPh], ['Temp (°C)', temp, setTemp], ['Ammonia', ammonia, setAmmonia], ['Nitrite', nitrite, setNitrite], ['Nitrate', nitrate, setNitrate], ['GH (dGH)', gh, setGh], ['KH (dKH)', kh, setKh]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <FieldLabel>{lbl}</FieldLabel>
                  <input type="number" step="0.01" value={val} onChange={e => set(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <button style={{ marginTop: 12 }} onClick={async () => {
              await api.parameters.log(id!, {
                ph: ph ? Number(ph) : null,
                temperature_c: temp ? Number(temp) : null,
                ammonia_ppm: ammonia ? Number(ammonia) : null,
                nitrite_ppm: nitrite ? Number(nitrite) : null,
                nitrate_ppm: nitrate ? Number(nitrate) : null,
                gh_dgh: gh ? Number(gh) : null,
                kh_dkh: kh ? Number(kh) : null,
                notes: null,
              })
              setPh(''); setTemp(''); setAmmonia(''); setNitrite(''); setNitrate(''); setGh(''); setKh('')
              params.reload(); alerts.reload()
            }}>Save reading</button>
          </Card>

          {chartData.length > 0 && (
            <>
              {[
                { key: 'ph', label: 'pH', color: '#378add', domain: [5, 9] },
                { key: 'temperature_c', label: 'Temperature (°C)', color: '#e07b3a', domain: [15, 35] },
                { key: 'ammonia_ppm', label: 'Ammonia (ppm)', color: '#c0392b', domain: [0, 2] },
                { key: 'nitrite_ppm', label: 'Nitrite (ppm)', color: '#8e44ad', domain: [0, 2] },
                { key: 'nitrate_ppm', label: 'Nitrate (ppm)', color: '#d4ac0d', domain: [0, 80] },
              ].filter(({ key }) => chartData.some((d: any) => d[key] != null)).map(({ key, label: lbl, color, domain }) => (
                <Card key={key}>
                  <SectionTitle>{lbl}</SectionTitle>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="recorded_at" tickFormatter={v => formatDate(v, dateFormat)} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                      <YAxis domain={domain as [number, number]} tick={{ fontSize: 11, fill: 'var(--text-2)' }} />
                      <Tooltip
                        formatter={(v: number) => v.toFixed(2)}
                        labelFormatter={v => formatDateTime(v, dateFormat)}
                        contentStyle={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                      />
                      <Line type="monotone" dataKey={key} stroke={color} dot={chartData.length < 15} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Add task</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <FieldLabel>Task type</FieldLabel>
                <select value={taskType} onChange={e => setTaskType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {!isRecurring && (
                <div>
                  <FieldLabel>Due date</FieldLabel>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-label)', marginBottom: 12 }}>
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
              Repeat this task
            </label>

            {isRecurring && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
                <div>
                  <FieldLabel>Every</FieldLabel>
                  <select value={recurWeeks} onChange={e => setRecurWeeks(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {[1, 2, 3, 4, 6, 8, 12].map(w => (
                      <option key={w} value={w}>{w === 1 ? 'week' : `${w} weeks`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>On</FieldLabel>
                  <select value={recurDay} onChange={e => setRecurDay(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Notes (optional)</FieldLabel>
              <input value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="e.g. 30% water change" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button onClick={addTask}>Add task</button>
          </Card>

          {pendingTasks.length > 0 && (
            <Card>
              <SectionTitle>Upcoming</SectionTitle>
              {pendingTasks.map(t => {
                const overdue = new Date(t.due_at) < new Date()
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid var(--border-sub)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.task_type}</span>
                        {overdue && <Tag compact bg="var(--red-bg)" color="var(--red)">Overdue</Tag>}
                        {t.is_recurring && (
                          <Tag compact bg="var(--blue-bg)" color="var(--blue)">
                            ↻ every {t.recur_every_weeks === 1 ? 'week' : `${t.recur_every_weeks} weeks`} on {DAY_NAMES[t.recur_day_of_week]}
                          </Tag>
                        )}
                      </div>
                      {t.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{t.description}</p>}
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text-3)' }}>
                        Due {formatDate(t.due_at, dateFormat)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => completeTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--green-border)', background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }}>Done</button>
                      <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                )
              })}
            </Card>
          )}

          {doneTasks.length > 0 && (
            <Card>
              <SectionTitle muted>Completed</SectionTitle>
              {doneTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border-sub)', opacity: 0.6 }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'line-through' }}>{t.task_type}</span>
                    {t.description && <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>{t.description}</span>}
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Completed {formatDate(t.completed_at, dateFormat)}</p>
                  </div>
                  <button onClick={() => deleteTask(t.id)} style={{ fontSize: 11, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </Card>
          )}

          {tasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No tasks scheduled yet.</p>}
        </div>
      )}

      {/* DAILY TAB */}
      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 0 }}>
            {/* Grid header */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Time</div>
              {DAY_ABBR.map((d, i) => (
                <div key={d} style={{
                  padding: '8px 4px', fontSize: 11, fontWeight: 600, textAlign: 'center',
                  color: i === todayColIndex ? 'var(--blue)' : 'var(--text-2)',
                  background: i === todayColIndex ? 'var(--blue-bg)' : 'transparent',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Scrollable rows */}
            <div>
              {Array.from({ length: 24 }, (_, hour) => {
                const rowHasTasks = [0, 1, 2, 3, 4, 5, 6].some(day => (dailyCellMap[`${day}-${hour}`]?.length ?? 0) > 0)
                return (
                  <div key={hour} style={{
                    display: 'grid',
                    gridTemplateColumns: '60px repeat(7, 1fr)',
                    borderBottom: '0.5px solid var(--border-sub)',
                    minHeight: rowHasTasks ? undefined : 30,
                    background: hour % 2 === 0 ? 'transparent' : 'var(--surface-2)',
                  }}>
                    <div style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', alignSelf: 'flex-start', paddingTop: 8 }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map(day => {
                      const cellTasks = dailyCellMap[`${day}-${hour}`] ?? []
                      return (
                        <div key={day} style={{
                          padding: '4px 3px',
                          display: 'flex', flexDirection: 'column', gap: 2,
                          background: day === todayColIndex ? 'var(--blue-bg)' : 'transparent',
                        }}>
                          {cellTasks.map((task: any) => {
                            const c = task.color ?? '#1e88e5'
                            return (
                              <span key={task.id} title={`${task.name} — click × to remove`} style={{
                                display: 'flex', alignItems: 'center', gap: 2,
                                fontSize: 10, padding: '2px 5px', borderRadius: 4,
                                background: `${c}22`, color: c,
                                border: `0.5px solid ${c}55`,
                                lineHeight: 1.3, overflow: 'hidden',
                              }}>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {task.name}
                                </span>
                                <span
                                  onClick={() => removeDailyTask(task.id)}
                                  style={{ cursor: 'pointer', opacity: 0.7, flexShrink: 0, lineHeight: 1, fontSize: 11 }}
                                >×</span>
                              </span>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Add task form */}
          <Card>
            <SectionTitle>Add routine task</SectionTitle>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <FieldLabel>Task name</FieldLabel>
                <input
                  value={dtName} onChange={e => setDtName(e.target.value)}
                  placeholder="e.g. Morning feed, CO2 on, Lights on"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && addDailyTask()}
                />
              </div>
              <div>
                <FieldLabel>Hour</FieldLabel>
                <select value={dtHour} onChange={e => setDtHour(e.target.value)} style={{ width: 80 }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Minute</FieldLabel>
                <select value={dtMinute} onChange={e => setDtMinute(e.target.value)} style={{ width: 70 }}>
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Days</FieldLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {DAY_ABBR.map((d, i) => {
                  const on = dtDays.includes(i)
                  return (
                    <button key={d} onClick={() => setDtDays(prev => on ? prev.filter(x => x !== i) : [...prev, i].sort())}
                      style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                        border: on ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
                        background: on ? 'var(--blue-bg)' : 'transparent',
                        color: on ? 'var(--blue)' : 'var(--text-2)',
                        fontWeight: on ? 500 : 400,
                      }}
                    >{d}</button>
                  )
                })}
                <button onClick={() => setDtDays(dtDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6])}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text-3)' }}>
                  {dtDays.length === 7 ? 'None' : 'Every day'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <FieldLabel>Colour</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {DAILY_COLORS.map(c => (
                  <button key={c} onClick={() => setDtColor(c)} style={{
                    width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer',
                    border: dtColor === c ? `2.5px solid var(--text)` : '2px solid transparent',
                    padding: 0, flexShrink: 0,
                  }} />
                ))}
              </div>
            </div>

            <button
              onClick={addDailyTask}
              disabled={!dtName.trim() || dtDays.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                opacity: dtName.trim() && dtDays.length > 0 ? 1 : 0.45,
              }}
            >
              <Plus size={13} />Add to schedule
            </button>
          </Card>
        </div>
      )}

      {/* EDIT TAB */}
      {tab === 'edit' && <EditTankPanel tank={tank} onSave={reloadTank} />}

      {/* ALERTS TAB */}
      {tab === 'alerts' && (
        <Card>
          <SectionTitle>Alerts</SectionTitle>
          {alerts.data?.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>No alerts.</p>}
          {alerts.data?.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid var(--border-sub)', opacity: a.acknowledged ? 0.5 : 1 }}>
              <div>
                <Tag bg={a.severity === 'danger' ? 'var(--red-bg)' : 'var(--amber-bg)'} color={a.severity === 'danger' ? 'var(--red)' : 'var(--amber)'} style={{ marginRight: 8 }}>
                  {a.severity}
                </Tag>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{a.message}</span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)' }}>{formatDateTime(a.triggered_at, dateFormat)}</p>
              </div>
              {!a.acknowledged && (
                <button onClick={async () => { await api.alerts.acknowledge(id!, a.id); alerts.reload() }} style={{ fontSize: 11, background: 'none', border: '0.5px solid var(--btn-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}>
                  Ack
                </button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
