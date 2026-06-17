import React, { useState, useEffect, useRef } from 'react'
import { Fish, Leaf, Upload, Link, Shrimp, Bug, Plus, Pencil, X } from 'lucide-react'
import { Tag, tabStyle, Card, FieldLabel } from '../components/ui'
import { api } from '../api/client'
import type { SpeciesBody } from '../api/client'

interface Species {
  slug: string
  common_name: string
  latin_name: string
  type: string
  family?: string
  origin?: string
  care?: {
    difficulty?: string
    min_tank_litres?: number
    shoal_min?: number
    group_min?: number
    max_size_cm?: number
    lifespan_years?: number
    growth_rate?: string
  }
  water?: {
    temp_c?: { min: number; max: number }
    ph?: { min: number; max: number }
    gh_dgh?: { min: number; max: number }
    kh_dkh?: { min: number; max: number }
  }
  compatibility?: { temperament?: string }
  light?: { requirement?: string }
  co2_required?: boolean
  notes?: string
}

// ── Species form ─────────────────────────────────────────────────────────────

interface SpeciesFormData {
  slug: string; common_name: string; latin_name: string; type: string
  family: string; origin: string
  difficulty: string; min_tank_litres: string; shoal_min: string; group_min: string
  max_size_cm: string; lifespan_years: string; growth_rate: string
  temp_min: string; temp_max: string; ph_min: string; ph_max: string
  gh_min: string; gh_max: string; kh_min: string; kh_max: string
  temperament: string; light_requirement: string; co2_required: string
  notes: string
}

const EMPTY_FORM: SpeciesFormData = {
  slug: '', common_name: '', latin_name: '', type: 'fish',
  family: '', origin: '',
  difficulty: '', min_tank_litres: '', shoal_min: '', group_min: '',
  max_size_cm: '', lifespan_years: '', growth_rate: '',
  temp_min: '', temp_max: '', ph_min: '', ph_max: '',
  gh_min: '', gh_max: '', kh_min: '', kh_max: '',
  temperament: '', light_requirement: '', co2_required: '',
  notes: '',
}

function toSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function speciesToForm(s: Species): SpeciesFormData {
  return {
    slug: s.slug, common_name: s.common_name, latin_name: s.latin_name, type: s.type,
    family: s.family ?? '', origin: s.origin ?? '',
    difficulty: s.care?.difficulty ?? '',
    min_tank_litres: s.care?.min_tank_litres?.toString() ?? '',
    shoal_min: s.care?.shoal_min?.toString() ?? '',
    group_min: s.care?.group_min?.toString() ?? '',
    max_size_cm: s.care?.max_size_cm?.toString() ?? '',
    lifespan_years: s.care?.lifespan_years?.toString() ?? '',
    growth_rate: s.care?.growth_rate ?? '',
    temp_min: s.water?.temp_c?.min?.toString() ?? '',
    temp_max: s.water?.temp_c?.max?.toString() ?? '',
    ph_min: s.water?.ph?.min?.toString() ?? '',
    ph_max: s.water?.ph?.max?.toString() ?? '',
    gh_min: s.water?.gh_dgh?.min?.toString() ?? '',
    gh_max: s.water?.gh_dgh?.max?.toString() ?? '',
    kh_min: s.water?.kh_dkh?.min?.toString() ?? '',
    kh_max: s.water?.kh_dkh?.max?.toString() ?? '',
    temperament: s.compatibility?.temperament ?? '',
    light_requirement: s.light?.requirement ?? '',
    co2_required: s.co2_required === true ? 'true' : s.co2_required === false ? 'false' : '',
    notes: s.notes ?? '',
  }
}

function buildSubmitBody(form: SpeciesFormData): SpeciesBody {
  const body: SpeciesBody = {
    slug: form.slug.trim(),
    common_name: form.common_name.trim(),
    latin_name: form.latin_name.trim(),
    type: form.type,
  }
  if (form.family.trim()) body.family = form.family.trim()
  if (form.origin.trim()) body.origin = form.origin.trim()

  const care: SpeciesBody['care'] = {}
  if (form.difficulty) care.difficulty = form.difficulty
  if (form.min_tank_litres) care.min_tank_litres = Number(form.min_tank_litres)
  if (form.shoal_min) care.shoal_min = Number(form.shoal_min)
  if (form.group_min) care.group_min = Number(form.group_min)
  if (form.max_size_cm) care.max_size_cm = Number(form.max_size_cm)
  if (form.lifespan_years) care.lifespan_years = Number(form.lifespan_years)
  if (form.growth_rate) care.growth_rate = form.growth_rate
  if (Object.keys(care).length) body.care = care

  const water: SpeciesBody['water'] = {}
  if (form.temp_min || form.temp_max) water.temp_c = { ...(form.temp_min ? { min: Number(form.temp_min) } : {}), ...(form.temp_max ? { max: Number(form.temp_max) } : {}) }
  if (form.ph_min || form.ph_max) water.ph = { ...(form.ph_min ? { min: Number(form.ph_min) } : {}), ...(form.ph_max ? { max: Number(form.ph_max) } : {}) }
  if (form.gh_min || form.gh_max) water.gh_dgh = { ...(form.gh_min ? { min: Number(form.gh_min) } : {}), ...(form.gh_max ? { max: Number(form.gh_max) } : {}) }
  if (form.kh_min || form.kh_max) water.kh_dkh = { ...(form.kh_min ? { min: Number(form.kh_min) } : {}), ...(form.kh_max ? { max: Number(form.kh_max) } : {}) }
  if (Object.keys(water).length) body.water = water

  if (form.temperament) body.compatibility = { temperament: form.temperament }
  if (form.light_requirement) body.light = { requirement: form.light_requirement }
  if (form.co2_required !== '') body.co2_required = form.co2_required === 'true'
  if (form.notes.trim()) body.notes = form.notes.trim()

  return body
}

// ── Species modal ─────────────────────────────────────────────────────────────

function SpeciesModal({ initial, onClose, onSaved }: {
  initial?: Species | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState<SpeciesFormData>(initial ? speciesToForm(initial) : EMPTY_FORM)
  const [slugEdited, setSlugEdited] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function set(field: keyof SpeciesFormData, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'common_name' && !slugEdited) next.slug = toSlug(value)
      return next
    })
  }

  async function handleSave() {
    if (!form.common_name.trim() || !form.latin_name.trim() || !form.slug.trim()) {
      setError('Common name, Latin name, and slug are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = buildSubmitBody(form)
      if (isEdit) {
        await api.species.update(initial!.slug, body)
      } else {
        await api.species.create(body)
      }
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save species')
    } finally {
      setSaving(false)
    }
  }

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  function Sect({ label, first }: { label: string; first?: boolean }) {
    return (
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'var(--text-3)',
        textTransform: 'uppercase', margin: first ? '0 0 14px' : '22px 0 14px',
        paddingTop: first ? 0 : 16, borderTop: first ? 'none' : '0.5px solid var(--border)',
      }}>{label}</p>
    )
  }

  function RangeField({ label, minKey, maxKey, step }: {
    label: string; minKey: keyof SpeciesFormData; maxKey: keyof SpeciesFormData; step?: string
  }) {
    return (
      <div>
        <FieldLabel>{label}</FieldLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="number" step={step ?? 'any'} placeholder="Min"
            value={form[minKey]} onChange={e => set(minKey, e.target.value)}
            style={{ flex: 1, minWidth: 0 }} />
          <span style={{ color: 'var(--text-3)', fontSize: 13, flexShrink: 0 }}>–</span>
          <input type="number" step={step ?? 'any'} placeholder="Max"
            value={form[maxKey]} onChange={e => set(maxKey, e.target.value)}
            style={{ flex: 1, minWidth: 0 }} />
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 16, width: 620, maxWidth: '92vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)', flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
            {isEdit ? `Edit — ${initial!.common_name}` : 'Add species'}
          </p>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, lineHeight: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 20 }}>

          <Sect label="Identity" first />
          <div style={{ ...grid2, marginBottom: 12 }}>
            <div>
              <FieldLabel>Common name *</FieldLabel>
              <input value={form.common_name} onChange={e => set('common_name', e.target.value)}
                placeholder="e.g. Neon Tetra" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Latin name *</FieldLabel>
              <input value={form.latin_name} onChange={e => set('latin_name', e.target.value)}
                placeholder="e.g. Paracheirodon innesi" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={grid2}>
            <div>
              <FieldLabel>Type *</FieldLabel>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="fish">Fish</option>
                <option value="plant">Plant</option>
                <option value="invertebrate">Invertebrate</option>
                <option value="amphibian">Amphibian</option>
              </select>
            </div>
            <div>
              <FieldLabel>
                Slug{!isEdit && <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> (auto-generated)</span>}
              </FieldLabel>
              <input
                value={form.slug}
                onChange={e => { setSlugEdited(true); set('slug', e.target.value) }}
                placeholder="e.g. neon-tetra"
                readOnly={isEdit}
                style={{ width: '100%', boxSizing: 'border-box', opacity: isEdit ? 0.55 : 1 }}
              />
            </div>
          </div>

          <Sect label="Origin" />
          <div style={grid2}>
            <div>
              <FieldLabel>Family</FieldLabel>
              <input value={form.family} onChange={e => set('family', e.target.value)}
                placeholder="e.g. Characidae" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Origin / Region</FieldLabel>
              <input value={form.origin} onChange={e => set('origin', e.target.value)}
                placeholder="e.g. South America" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <Sect label="Care" />
          <div style={{ ...grid2, marginBottom: 12 }}>
            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">— not set —</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <FieldLabel>Min tank size (L)</FieldLabel>
              <input type="number" min={0} value={form.min_tank_litres}
                onChange={e => set('min_tank_litres', e.target.value)}
                placeholder="e.g. 60" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ ...grid2, marginBottom: 12 }}>
            <div>
              <FieldLabel>Max size (cm)</FieldLabel>
              <input type="number" step="0.1" min={0} value={form.max_size_cm}
                onChange={e => set('max_size_cm', e.target.value)}
                placeholder="e.g. 4" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Lifespan (years)</FieldLabel>
              <input type="number" step="0.5" min={0} value={form.lifespan_years}
                onChange={e => set('lifespan_years', e.target.value)}
                placeholder="e.g. 5" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ ...grid2, marginBottom: 12 }}>
            <div>
              <FieldLabel>Min shoal size</FieldLabel>
              <input type="number" min={1} value={form.shoal_min}
                onChange={e => set('shoal_min', e.target.value)}
                placeholder="e.g. 6" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <FieldLabel>Min group size</FieldLabel>
              <input type="number" min={1} value={form.group_min}
                onChange={e => set('group_min', e.target.value)}
                placeholder="e.g. 3" style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <FieldLabel>Growth rate <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(plants)</span></FieldLabel>
            <select value={form.growth_rate} onChange={e => set('growth_rate', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
              <option value="">— not set —</option>
              <option value="slow">Slow</option>
              <option value="medium">Medium</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          <Sect label="Water parameters" />
          <div style={{ ...grid2, marginBottom: 12 }}>
            <RangeField label="Temperature (°C)" minKey="temp_min" maxKey="temp_max" step="0.5" />
            <RangeField label="pH" minKey="ph_min" maxKey="ph_max" step="0.1" />
          </div>
          <div style={grid2}>
            <RangeField label="GH (°dGH)" minKey="gh_min" maxKey="gh_max" />
            <RangeField label="KH (°dKH)" minKey="kh_min" maxKey="kh_max" />
          </div>

          <Sect label="Compatibility" />
          <div>
            <FieldLabel>Temperament</FieldLabel>
            <select value={form.temperament} onChange={e => set('temperament', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
              <option value="">— not set —</option>
              <option value="peaceful">Peaceful</option>
              <option value="semi-aggressive">Semi-aggressive</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <Sect label="Light & CO₂" />
          <div style={grid2}>
            <div>
              <FieldLabel>Light requirement</FieldLabel>
              <select value={form.light_requirement} onChange={e => set('light_requirement', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">— not set —</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <FieldLabel>CO₂ required</FieldLabel>
              <select value={form.co2_required} onChange={e => set('co2_required', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                <option value="">— not set —</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <Sect label="Notes" />
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Care notes, special requirements, tips…"
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
          />

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '0.5px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {error
            ? <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', flex: 1 }}>{error}</p>
            : <span style={{ flex: 1 }} />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: '0.5px solid var(--btn-border)', background: 'transparent', color: 'var(--text)',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
              opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add species'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Species card ──────────────────────────────────────────────────────────────

function DifficultyBadge({ d }: { d?: string }) {
  if (!d) return null
  const palette: Record<string, { bg: string; color: string }> = {
    beginner:     { bg: 'var(--green-bg)', color: 'var(--green)' },
    intermediate: { bg: 'var(--amber-bg)', color: 'var(--amber)' },
    advanced:     { bg: 'var(--red-bg)',   color: 'var(--red)' },
  }
  const s = palette[d] ?? { bg: 'var(--tag-bg)', color: 'var(--text-2)' }
  return <Tag bg={s.bg} color={s.color}>{d}</Tag>
}

function SpeciesCard({ s, onEdit }: { s: Species; onEdit: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onClick={() => setOpen(v => !v)}
      style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 2px', color: 'var(--text)' }}>{s.common_name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 8px', fontStyle: 'italic' }}>{s.latin_name}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(() => {
              const typeStyle: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
                fish:        { bg: 'var(--blue-bg)',   color: 'var(--blue)',   icon: <Fish size={10} /> },
                plant:       { bg: 'var(--green-bg)',  color: 'var(--green)',  icon: <Leaf size={10} /> },
                invertebrate:{ bg: 'var(--amber-bg)',  color: 'var(--amber)',  icon: <Shrimp size={10} /> },
                amphibian:   { bg: 'var(--tag-bg)',    color: 'var(--text-2)', icon: <Bug size={10} /> },
              }
              const ts = typeStyle[s.type] ?? { bg: 'var(--tag-bg)', color: 'var(--text-2)', icon: null }
              return (
                <Tag bg={ts.bg} color={ts.color}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{ts.icon}{s.type}</span>
                </Tag>
              )
            })()}
            <DifficultyBadge d={s.care?.difficulty} />
            {s.origin && <Tag bg="var(--tag-bg)" color="var(--text-2)">{s.origin}</Tag>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            title="Edit species"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3, lineHeight: 0, borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <Pencil size={13} />
          </button>
          <span style={{ fontSize: 16, color: 'var(--text-3)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 14, borderTop: '0.5px solid var(--border-sub)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
            {s.water?.temp_c && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Temperature</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.water.temp_c.min}–{s.water.temp_c.max} °C</p>
              </div>
            )}
            {s.water?.ph && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>pH</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.water.ph.min}–{s.water.ph.max}</p>
              </div>
            )}
            {s.care?.min_tank_litres && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Min tank</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.care.min_tank_litres} L</p>
              </div>
            )}
            {s.care?.shoal_min && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Min shoal</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.care.shoal_min}+</p>
              </div>
            )}
            {s.care?.group_min && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Min group</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.care.group_min}+</p>
              </div>
            )}
            {s.care?.max_size_cm && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Max size</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.care.max_size_cm} cm</p>
              </div>
            )}
            {s.light?.requirement && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Light</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.light.requirement}</p>
              </div>
            )}
            {s.co2_required !== undefined && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>CO₂</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.co2_required ? 'Required' : 'Not required'}</p>
              </div>
            )}
            {s.compatibility?.temperament && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 2px' }}>Temperament</p>
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text)' }}>{s.compatibility.temperament}</p>
              </div>
            )}
          </div>
          {s.notes && (
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
              {s.notes}
            </p>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-4)', margin: '10px 0 0' }}>slug: {s.slug}</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const inlineCode: React.CSSProperties = {
  fontSize: 11, background: 'var(--tag-bg)', padding: '1px 5px', borderRadius: 4, color: 'var(--text)',
}

function modeTab(active: boolean): React.CSSProperties {
  return {
    fontSize: 12, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: active ? 500 : 400,
    border: active ? '0.5px solid var(--blue-border)' : '0.5px solid var(--btn-border)',
    background: active ? 'var(--blue-bg)' : 'transparent',
    color: active ? 'var(--blue)' : 'var(--text-2)',
  }
}

export default function SpeciesBrowser() {
  const [all, setAll] = useState<Species[]>([])
  const [filter, setFilter] = useState<'all' | 'fish' | 'plant' | 'invertebrate' | 'amphibian'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showUpload, setShowUpload] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ slug: string; common_name: string; type: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalMode, setModalMode] = useState<null | 'add' | 'edit'>(null)
  const [editTarget, setEditTarget] = useState<Species | null>(null)

  function loadSpecies() {
    setLoading(true)
    fetch('/api/species/')
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => { setAll(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { loadSpecies() }, [])

  async function handleUpload() {
    if (uploadMode === 'file' && !uploadFile) return
    if (uploadMode === 'url' && !uploadUrl.trim()) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    try {
      let result
      if (uploadMode === 'file') {
        result = await api.species.upload(uploadFile!)
        setUploadFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        result = await api.species.uploadFromUrl(uploadUrl.trim())
        setUploadUrl('')
      }
      setUploadResult(result)
      loadSpecies()
    } catch (e: any) {
      setUploadError(e.message ?? 'Import failed')
    } finally {
      setUploading(false)
    }
  }

  const visible = all.filter(s => {
    if (filter !== 'all' && s.type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.common_name.toLowerCase().includes(q) || s.latin_name.toLowerCase().includes(q) || s.slug.includes(q)
    }
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Species</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setEditTarget(null); setModalMode('add') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)', cursor: 'pointer', fontWeight: 500 }}
          >
            <Plus size={14} />Add species
          </button>
          <button
            onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}
          >
            {!showUpload && <Upload size={14} />}
            {showUpload ? 'Cancel' : 'Upload YAML'}
          </button>
        </div>
      </div>

      {showUpload && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)' }}>Import species from YAML</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Requires <code style={inlineCode}>slug</code>, <code style={inlineCode}>type</code>,{' '}
            <code style={inlineCode}>common_name</code>, and <code style={inlineCode}>latin_name</code>.
            Saved to the species-data volume and indexed immediately.
          </p>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <button
              onClick={() => { setUploadMode('file'); setUploadResult(null); setUploadError(null) }}
              style={{ ...modeTab(uploadMode === 'file'), display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Upload size={12} />Upload file
            </button>
            <button
              onClick={() => { setUploadMode('url'); setUploadResult(null); setUploadError(null) }}
              style={{ ...modeTab(uploadMode === 'url'), display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Link size={12} />From URL
            </button>
          </div>

          {uploadMode === 'file' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input ref={fileInputRef} type="file" accept=".yaml,.yml" style={{ display: 'none' }}
                onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadResult(null); setUploadError(null) }} />
              <div onClick={() => fileInputRef.current?.click()} style={{
                flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer',
                border: '0.5px solid var(--btn-border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)',
              }}>
                <span style={{ padding: '7px 12px', background: 'var(--surface-2)', borderRight: '0.5px solid var(--btn-border)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Choose file
                </span>
                <span style={{ padding: '7px 10px', fontSize: 12, color: uploadFile ? 'var(--text)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadFile ? uploadFile.name : 'No file chosen'}
                </span>
              </div>
              <button onClick={handleUpload} disabled={!uploadFile || uploading} style={{
                fontSize: 13, padding: '7px 18px', borderRadius: 8, fontWeight: 500,
                border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed',
                opacity: uploadFile && !uploading ? 1 : 0.45, flexShrink: 0,
              }}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}

          {uploadMode === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>GitHub blob URLs are converted to raw automatically.</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="url" value={uploadUrl}
                  onChange={e => { setUploadUrl(e.target.value); setUploadResult(null); setUploadError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleUpload()}
                  placeholder="https://raw.githubusercontent.com/…/species.yaml"
                  style={{ flex: 1, boxSizing: 'border-box' }} />
                <button onClick={handleUpload} disabled={!uploadUrl.trim() || uploading} style={{
                  fontSize: 13, padding: '7px 18px', borderRadius: 8, fontWeight: 500,
                  border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                  cursor: uploadUrl.trim() && !uploading ? 'pointer' : 'not-allowed',
                  opacity: uploadUrl.trim() && !uploading ? 1 : 0.45, flexShrink: 0,
                }}>
                  {uploading ? 'Fetching…' : 'Import'}
                </button>
              </div>
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>✓ Added {uploadResult.common_name} ({uploadResult.type})</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--green)' }}>slug: {uploadResult.slug}</p>
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '0.5px solid var(--red-border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--red)' }}>{uploadError}</p>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or slug…" style={{ flex: 1, minWidth: 200 }} />
        <button style={{ ...tabStyle(filter === 'all', true) }} onClick={() => setFilter('all')}>All</button>
        <button style={{ ...tabStyle(filter === 'fish', true), display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => setFilter('fish')}><Fish size={13} />Fish</button>
        <button style={{ ...tabStyle(filter === 'invertebrate', true), display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => setFilter('invertebrate')}><Shrimp size={13} />Invertebrates</button>
        <button style={{ ...tabStyle(filter === 'amphibian', true), display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => setFilter('amphibian')}><Bug size={13} />Amphibians</button>
        <button style={{ ...tabStyle(filter === 'plant', true), display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={() => setFilter('plant')}><Leaf size={13} />Plants</button>
      </div>

      {loading && <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Loading species…</p>}
      {error && <p style={{ color: 'var(--red)', fontSize: 14 }}>Could not load species: {error}</p>}

      {!loading && !error && visible.length === 0 && (
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No species found. Add one with the button above or upload a .yaml file.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(s => (
          <SpeciesCard
            key={s.slug}
            s={s}
            onEdit={() => { setEditTarget(s); setModalMode('edit') }}
          />
        ))}
      </div>

      {modalMode && (
        <SpeciesModal
          initial={modalMode === 'edit' ? editTarget : null}
          onClose={() => { setModalMode(null); setEditTarget(null) }}
          onSaved={loadSpecies}
        />
      )}
    </div>
  )
}
