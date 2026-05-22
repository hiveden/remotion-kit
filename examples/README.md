# examples/

Hello-clip brief notes you can copy + tweak instead of starting from a blank brief.
Pick one, paste the Scene prompt + References into a new clip in the editor, hit
**Generate**, then iterate.

| File | What it makes | Duration | Aspect | Why it's here |
|---|---|---|---|---|
| `hello-fade-in.note` | Single fading "HELLO" title | 5 s | 9:16 | Smallest possible clip — smoke-checks the toolchain end-to-end |
| `product-card-9x16.note` | Product name + tagline + accent bar | 6 s | 9:16 | A real shape you'd use in a social short |
| `data-counter.note` | Number counter-up + caption | 4 s | 16:9 | One `interpolate()` call — canonical metric beat |

## How to use a `.note`

1. `bun run dev` and open `http://localhost:3200/clip` (use `PORT=<n>` if 3200 is taken)
2. Click **+ New clip**, give it any name
3. In the editor:
   - Open the `.note` file, copy the **Scene prompt** block into the *Generate panel → Scene prompt*
   - Replace any tokens in `{Token}` columns with real values
   - Set **Target duration** and **Aspect ratio** to match the note's header
   - Add each line under **References** as a separate reference entry
4. Hit **Generate**. The composition is written to `.workspace/clips/<id>/src/Composition.tsx`
5. The Preview pane on the right auto-reloads; hit ↻ if it doesn't

## Purity reminder

These notes are user-facing; `bun run check:purity` scans them. Do not use business
concepts (`episode|shot|series|pipeline`) in sample briefs. <!-- purity-allow: documenting the check -->

## Adding your own examples

Drop a new `.note` here and add a row to the table above. Keep them under ~80 lines
each — these are reference cards, not full design docs. If a note grows past 80 lines,
it's probably a design pattern doc, which belongs in `docs/` instead.
