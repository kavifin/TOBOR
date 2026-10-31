import { Check } from 'lucide-react'
import { STAGES, ORDER_STAGES, PLACED_STAGE, stageIndex } from '../../shared/status.js'
import { dateTime } from '../lib/format.js'

export default function StatusTimeline({ record }) {
  const stages = record.type === 'photo' ? STAGES : [PLACED_STAGE, ...ORDER_STAGES]
  const current = stageIndex(stages, record.status)
  const when = (id) => [...record.history].reverse().find((h) => h.status === id)?.at
  return (
    <ol className="timeline">
      {stages.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next'
        const at = when(s.id)
        return (
          <li key={s.id} className={`tl-${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="tl-mark" aria-hidden="true">{state === 'done' ? <Check size={14} /> : i + 1}</span>
            <div>
              <p className="tl-label">{s.label}</p>
              {state !== 'next' && <p className="tl-detail">{state === 'now' ? s.detail : at ? dateTime(at) : ''}</p>}
              {state === 'now' && at && <p className="tl-detail small">{dateTime(at)}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
