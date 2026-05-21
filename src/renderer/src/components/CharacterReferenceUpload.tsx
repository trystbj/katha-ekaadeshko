import { useCallback, useMemo, useRef, useState } from 'react'
import { useUiText, type UiTranslateFn } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import type {
  CharacterReferenceRole,
  CharacterReferenceStrength,
  ProjectState
} from '../types/story'
const ACCEPT = 'image/png,image/jpeg,image/webp'

function roleLabel(role: CharacterReferenceRole | string, translate: UiTranslateFn): string {
  const k =
    role === 'front'
      ? 'characterRefRoleFront'
      : role === 'side'
        ? 'characterRefRoleSide'
        : role === 'expression'
          ? 'characterRefRoleExpression'
          : 'characterRefRoleOther'
  return translate(k)
}

async function fileToResizedDataUrl(file: File, maxSide = 768): Promise<string> {
  const imgUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not load image'))
      el.src = imgUrl
    })
    const w0 = img.naturalWidth || img.width
    const h0 = img.naturalHeight || img.height
    const scale = Math.min(1, maxSide / Math.max(w0, h0))
    const w = Math.max(1, Math.round(w0 * scale))
    const h = Math.max(1, Math.round(h0 * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    ctx.drawImage(img, 0, 0, w, h)
    // Prefer webp for size, fall back to jpeg.
    const out =
      c.toDataURL('image/webp', 0.86) ||
      c.toDataURL('image/jpeg', 0.86) ||
      c.toDataURL()
    return out
  } finally {
    URL.revokeObjectURL(imgUrl)
  }
}

function ensureConfig(p: ProjectState): NonNullable<ProjectState['characterReference']> {
  return (
    p.characterReference ?? {
      lockAllEpisodes: true,
      strength: 'balanced',
      autoTurnaroundPreview: false,
      images: []
    }
  )
}

type UploadProps = {
  /** When set, refs attach to this bible character instead of project-wide pool. */
  characterId?: string
}

export function CharacterReferenceUpload({ characterId }: UploadProps = {}) {
  const uiText = useUiText()
  const project = useStudioStore((s) => s.project)
  const patchProject = useStudioStore((s) => s.patchProject)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const character = useMemo(
    () => (characterId && project?.bible ? project.bible.characters.find((c) => c.id === characterId) : null),
    [characterId, project?.bible]
  )

  const cfg = useMemo(() => (project && !characterId ? ensureConfig(project) : null), [project, characterId])
  const images = characterId ? (character?.referenceImages ?? []) : (cfg?.images ?? [])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!project) return
      const list = Array.from(files || [])
        .filter(Boolean)
        .filter((f) => ACCEPT.split(',').includes(f.type))
        .slice(0, 3)
      if (!list.length) return

      const roles: CharacterReferenceRole[] = ['front', 'side', 'expression']
      const now = new Date().toISOString()
      const resized = await Promise.all(
        list.map(async (f, i) => ({
          id: `ref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          role: roles[i] ?? 'other',
          dataUrl: await fileToResizedDataUrl(f, 768),
          filename: f.name,
          addedAt: now
        }))
      )

      patchProject((p) => {
        if (characterId && p.bible) {
          return {
            ...p,
            bible: {
              ...p.bible,
              characters: p.bible.characters.map((c) =>
                c.id === characterId
                  ? { ...c, referenceImages: [...(c.referenceImages ?? []), ...resized].slice(0, 3) }
                  : c
              )
            },
            updatedAt: new Date().toISOString()
          }
        }
        const cur = ensureConfig(p)
        const merged = [...cur.images, ...resized].slice(0, 3)
        return { ...p, characterReference: { ...cur, images: merged }, updatedAt: new Date().toISOString() }
      })
    },
    [patchProject, project, characterId]
  )

  const removeImage = useCallback(
    (id: string) => {
      patchProject((p) => {
        if (characterId && p.bible) {
          return {
            ...p,
            bible: {
              ...p.bible,
              characters: p.bible.characters.map((c) =>
                c.id === characterId
                  ? { ...c, referenceImages: (c.referenceImages ?? []).filter((x) => x.id !== id) }
                  : c
              )
            },
            updatedAt: new Date().toISOString()
          }
        }
        const cur = ensureConfig(p)
        return {
          ...p,
          characterReference: { ...cur, images: cur.images.filter((x) => x.id !== id) },
          updatedAt: new Date().toISOString()
        }
      })
    },
    [patchProject, characterId]
  )

  const setLock = useCallback(
    (lockAllEpisodes: boolean) => {
      if (characterId) return
      patchProject((p) => {
        const cur = ensureConfig(p)
        return { ...p, characterReference: { ...cur, lockAllEpisodes }, updatedAt: new Date().toISOString() }
      })
    },
    [patchProject, characterId]
  )

  const setStrength = useCallback(
    (strength: CharacterReferenceStrength) => {
      if (characterId) return
      patchProject((p) => {
        const cur = ensureConfig(p)
        return { ...p, characterReference: { ...cur, strength }, updatedAt: new Date().toISOString() }
      })
    },
    [patchProject, characterId]
  )

  const setTurnaround = useCallback(
    (autoTurnaroundPreview: boolean) => {
      if (characterId) return
      patchProject((p) => {
        const cur = ensureConfig(p)
        return {
          ...p,
          characterReference: { ...cur, autoTurnaroundPreview },
          updatedAt: new Date().toISOString()
        }
      })
    },
    [patchProject, characterId]
  )

  if (!project) return null

  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
        {uiText('characterRefSectionSummary')}
      </summary>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void addFiles(e.dataTransfer.files)
          }}
          style={{
            border: `1px dashed ${dragOver ? 'var(--accent)' : 'rgba(255,255,255,0.18)'}`,
            borderRadius: 12,
            padding: 10
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {uiText('characterRefDragHint')}
            </div>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => inputRef.current?.click()}
            >
              {images.length ? uiText('characterRefReplaceOrAdd') : uiText('characterRefUpload')}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = e.target.files
                if (files) void addFiles(files)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {images.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {images.map((im) => (
              <div key={im.id} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ aspectRatio: '1 / 1', background: 'rgba(255,255,255,0.04)' }}>
                  <img
                    src={im.dataUrl}
                    alt={uiText('characterRefPreviewAlt', { role: roleLabel(im.role, uiText) })}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge">{roleLabel(im.role, uiText)}</span>
                  <button type="button" className="btn btn-ghost btn-small" onClick={() => removeImage(im.id)}>
                    {uiText('characterRefRemove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            {uiText('characterRefEmpty')}
          </div>
        )}

        {!characterId ? (
          <>
        <label className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: '0.9rem' }}>{uiText('characterRefLockConsistency')}</span>
          <input
            type="checkbox"
            checked={Boolean(cfg?.lockAllEpisodes)}
            onChange={(e) => setLock(e.target.checked)}
          />
        </label>

        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: '0.9rem' }}>{uiText('characterRefStrengthLabel')}</span>
          <select
            className="select"
            value={cfg?.strength ?? 'balanced'}
            onChange={(e) => setStrength((e.target.value as CharacterReferenceStrength) || 'balanced')}
            style={{ maxWidth: 220 }}
          >
            <option value="light">{uiText('characterRefStrengthLight')}</option>
            <option value="balanced">{uiText('characterRefStrengthBalanced')}</option>
            <option value="strong">{uiText('characterRefStrengthStrong')}</option>
          </select>
        </div>
          </>
        ) : null}

        {!characterId ? (
          <label className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '0.9rem' }}>{uiText('characterRefAutoTurnaround')}</span>
            <input
              type="checkbox"
              checked={Boolean(cfg?.autoTurnaroundPreview)}
              onChange={(e) => setTurnaround(e.target.checked)}
            />
          </label>
        ) : null}

        <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>
          {uiText('characterRefFooterLine', {
            note: uiText('characterRefNoteLabel'),
            hint: uiText('characterRefFooterHint')
          })}
        </div>
      </div>
    </details>
  )
}

