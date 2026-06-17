import React, { useState, useEffect, useRef } from 'react'
import { Fish, Leaf, Upload, Link, Shrimp, Bug } from 'lucide-react'
import { Tag, tabStyle, Card } from '../components/ui'
import { api } from '../api/client'

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
  }
  compatibility?: { temperament?: string }
  light?: { requirement?: string }
  co2_required?: boolean
  notes?: string
}

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

function SpeciesCard({ s }: { s: Species }) {
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
        <span style={{ fontSize: 16, color: 'var(--text-3)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>Species browser</h1>
        <button
          onClick={() => { setShowUpload(v => !v); setUploadResult(null); setUploadError(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '8px 16px', borderRadius: 8, border: '0.5px solid var(--btn-border)', background: 'transparent', cursor: 'pointer', color: 'var(--text)' }}
        >
          {!showUpload && <Upload size={14} />}
          {showUpload ? 'Cancel' : 'Upload YAML'}
        </button>
      </div>

      {showUpload && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 500, fontSize: 14, margin: '0 0 4px', color: 'var(--text)' }}>Import species from YAML</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Requires <code style={inlineCode}>slug</code>, <code style={inlineCode}>type</code>,{' '}
            <code style={inlineCode}>common_name</code>, and <code style={inlineCode}>latin_name</code>.
            Saved to the species-data volume and indexed immediately.
          </p>

          {/* Mode toggle */}
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

          {/* File mode */}
          {uploadMode === 'file' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Hidden native input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml"
                style={{ display: 'none' }}
                onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadResult(null); setUploadError(null) }}
              />
              {/* Styled file picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer',
                  border: '0.5px solid var(--btn-border)', borderRadius: 8, overflow: 'hidden',
                  background: 'var(--surface)',
                }}
              >
                <span style={{
                  padding: '7px 12px', background: 'var(--surface-2)',
                  borderRight: '0.5px solid var(--btn-border)',
                  fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  Choose file
                </span>
                <span style={{
                  padding: '7px 10px', fontSize: 12,
                  color: uploadFile ? 'var(--text)' : 'var(--text-3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {uploadFile ? uploadFile.name : 'No file chosen'}
                </span>
              </div>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                style={{
                  fontSize: 13, padding: '7px 18px', borderRadius: 8, fontWeight: 500,
                  border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                  cursor: uploadFile && !uploading ? 'pointer' : 'not-allowed',
                  opacity: uploadFile && !uploading ? 1 : 0.45, flexShrink: 0,
                }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          )}

          {/* URL mode */}
          {uploadMode === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                GitHub blob URLs are converted to raw automatically.
              </p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={e => { setUploadUrl(e.target.value); setUploadResult(null); setUploadError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleUpload()}
                  placeholder="https://raw.githubusercontent.com/…/species.yaml"
                  style={{ flex: 1, boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleUpload}
                  disabled={!uploadUrl.trim() || uploading}
                  style={{
                    fontSize: 13, padding: '7px 18px', borderRadius: 8, fontWeight: 500,
                    border: '0.5px solid var(--blue-border)', background: 'var(--blue-bg)', color: 'var(--blue)',
                    cursor: uploadUrl.trim() && !uploading ? 'pointer' : 'not-allowed',
                    opacity: uploadUrl.trim() && !uploading ? 1 : 0.45, flexShrink: 0,
                  }}
                >
                  {uploading ? 'Fetching…' : 'Import'}
                </button>
              </div>
            </div>
          )}

          {uploadResult && (
            <div style={{ marginTop: 12, background: 'var(--green-bg)', border: '0.5px solid var(--green-border)', borderRadius: 8, padding: '8px 12px' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                ✓ Added {uploadResult.common_name} ({uploadResult.type})
              </p>
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
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No species found. Upload a .yaml file above or add files to species-data/ and restart.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(s => <SpeciesCard key={s.slug} s={s} />)}
      </div>
    </div>
  )
}
