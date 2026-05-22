// 简易相对时间格式（无 i18n / 无 date-fns）。
// 中文输出，精度：刚刚 / N 分钟前 / N 小时前 / N 天前 / YYYY-MM-DD。

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export function formatRelativeTime(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return '(invalid time)'
  const diff = Date.now() - ts
  if (diff < MIN) return '刚刚'
  if (diff < HOUR) return `${Math.floor(diff / MIN)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`
  // 超过 7 天 → 显示 YYYY-MM-DD
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
