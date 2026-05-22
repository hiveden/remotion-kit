// components/clip/ClipReferencesInline.tsx
//
// Minimal references editor: text input (Enter to add) + ordered list with delete.
// References are free-text strings (URL / style description / asset path) that
// flow into the LLM prompt as "style guidance". No template picker, no preview.

'use client'

import { useCallback, useState } from 'react'

interface Props {
  references: string[]
  onChange: (next: string[]) => void
}

export function ClipReferencesInline({ references, onChange }: Props) {
  const [draft, setDraft] = useState('')

  const commit = useCallback(() => {
    const value = draft.trim()
    if (!value) return
    onChange([...references, value])
    setDraft('')
  }, [draft, references, onChange])

  function removeAt(index: number) {
    onChange(references.filter((_, i) => i !== index))
  }

  return (
    <section
      className="flex flex-col gap-2 border-t p-3"
      data-testid="clip-references-section"
    >
      <label className="text-xs font-medium text-neutral-500">References</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="URL or short style description; Enter to add"
          className="flex-1 rounded border bg-transparent px-2 py-1 text-sm"
          data-testid="clip-references-input"
        />
        <button
          type="button"
          onClick={commit}
          disabled={!draft.trim()}
          className="rounded border px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
          data-testid="clip-references-add"
        >
          Add
        </button>
      </div>
      {references.length === 0 ? (
        <p
          className="text-xs text-neutral-400"
          data-testid="clip-references-empty"
          data-state="empty"
        >
          Empty — the LLM will improvise from the brief alone.
        </p>
      ) : (
        <ol
          className="flex max-h-40 flex-col gap-1 overflow-y-auto text-sm"
          data-testid="clip-references-list"
        >
          {references.map((ref, index) => (
            <li
              key={`${index}-${ref}`}
              className="flex items-center gap-2 rounded border px-2 py-1"
              data-testid="clip-references-item"
            >
              <span className="flex-1 truncate" title={ref}>
                {ref}
              </span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label="Remove reference"
                className="text-neutral-400 hover:text-red-500"
                data-testid="clip-references-remove"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
