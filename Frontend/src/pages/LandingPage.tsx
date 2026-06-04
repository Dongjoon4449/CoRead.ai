import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, FileText, PenLine } from 'lucide-react'
import styles from './LandingPage.module.css'

// ─── DemoCard data ───────────────────────────────────────────────────────────

const SENTENCES = [
  { id: 1, text: 'Artificial intelligence is transforming the way we live and work.', score: null },
  { id: 2, text: 'It is being applied in healthcare, education, and many other fields.', score: 0.92 },
  { id: 3, text: 'These advancements bring significant benefits to society.', score: 0.88 },
  { id: 4, text: 'However, rapid AI development also raises ethical concerns.', score: 0.51 },
  { id: 5, text: 'For example, issues like privacy and bias are becoming more serious.', score: 0.35 },
  { id: 6, text: 'Therefore, responsible AI development and regulation are essential.', score: 0.76 },
  { id: 7, text: 'In the future, humans and AI should work together for a better world.', score: 0.81 },
]

// score 0 → salmon, 0.38 flat zone, 0.55 → yellow, 0.72 → green, 1.0 → blue
const COLOR_STOPS = [
  { score: 0.00, rgb: [255, 204, 188] as const }, // salmon
  { score: 0.38, rgb: [255, 204, 188] as const }, // salmon (flat zone — keeps low scores red)
  { score: 0.55, rgb: [255, 249, 196] as const }, // yellow
  { score: 0.72, rgb: [200, 230, 201] as const }, // green
  { score: 1.00, rgb: [187, 222, 251] as const }, // blue
]

function interpolateColor(score: number): string {
  const clamped = Math.max(0, Math.min(1, score))
  let lower = COLOR_STOPS[0]
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1]
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped <= COLOR_STOPS[i + 1].score) {
      lower = COLOR_STOPS[i]
      upper = COLOR_STOPS[i + 1]
      break
    }
  }
  const t = (clamped - lower.score) / (upper.score - lower.score)
  const r = Math.round(lower.rgb[0] + t * (upper.rgb[0] - lower.rgb[0]))
  const g = Math.round(lower.rgb[1] + t * (upper.rgb[1] - lower.rgb[1]))
  const b = Math.round(lower.rgb[2] + t * (upper.rgb[2] - lower.rgb[2]))
  return `rgb(${r}, ${g}, ${b})`
}

function getFlowBg(score: number | null): string {
  return interpolateColor(score ?? 1.0)
}

// ─── AnalysisPanel data ──────────────────────────────────────────────────────

const GAUGE_SIZE = 96
const STROKE_WIDTH = 8
const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const PROF_SCORE = 72

const GENRES = [
  { icon: <GraduationCap size={16} />, label: 'Academic Paper', pct: 72 },
  { icon: <FileText size={16} />, label: 'Magazine / Editorial', pct: 21 },
  { icon: <PenLine size={16} />, label: 'Blog / Casual Writing', pct: 7 },
]

const BREAKPOINTS = [
  { color: 'var(--status-danger)',  title: 'Sentence 4 → 5', desc: 'Sharp topic shift detected' },
  { color: 'var(--status-warning)', title: 'Sentence 3 → 4', desc: 'Moderate shift in topic' },
  { color: 'var(--status-success)', title: 'Sentence 6 → 7', desc: 'Smooth connection' },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'example' | 'yours'>('example')
  const [activeView, setActiveView] = useState<'flow' | 'similarity'>('flow')
  const dashoffset = CIRCUMFERENCE * (1 - PROF_SCORE / 100)

  return (
    <div className={styles.wrapper}>

      {/* ── Left ── */}
      <div className={styles.left}>

        {/* Navbar */}
        <nav className={styles.nav}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>C</span>
            <span className={styles.logoText}>ColoRead</span>
          </div>
        </nav>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.headline}>
            See the flow of<br />
            your writing in color.
          </h1>
          <p className={styles.subtext}>
            ColoRead analyzes the semantic flow between sentences and<br />
            shows where your writing connects — and where it breaks.
          </p>
          <div className={styles.heroButtons}>
            <button className={styles.tryDemo} onClick={() => navigate('/analyze')}>Try My Document</button>
            <button className={styles.howItWorks}>How It Works</button>
          </div>
        </section>

        {/* DemoCard */}
        <div className={styles.card}>
          <div className={styles.tabBar}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'example' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('example')}
              >
                ⬡ Example
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'yours' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('yours')}
              >
                □ Your Text
              </button>
            </div>
            <div className={styles.viewToggle}>
              <span className={styles.viewLabel}>View:</span>
              <div className={styles.toggleGroup}>
                <button
                  className={`${styles.toggleBtn} ${activeView === 'flow' ? styles.toggleActive : ''}`}
                  onClick={() => setActiveView('flow')}
                >
                  Flow
                </button>
                <button
                  className={`${styles.toggleBtn} ${activeView === 'similarity' ? styles.toggleActive : ''}`}
                  onClick={() => setActiveView('similarity')}
                >
                  Similarity
                </button>
              </div>
              <span className={styles.infoIcon}>ⓘ</span>
            </div>
          </div>

          <div className={styles.sentenceList}>
            {SENTENCES.map((s) => (
              <div
                key={s.id}
                className={styles.sentenceRow}
                style={{ backgroundColor: getFlowBg(s.score) }}
              >
                <span className={styles.sentenceNum}>{s.id}</span>
                <span className={styles.sentenceText}>{s.text}</span>
                <span className={styles.sentenceScore}>
                  {s.score === null ? '—' : s.score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.legend}>
            <div className={styles.legendLeft}>
              <span className={styles.legendLabel}>Low Flow</span>
              <div className={styles.legendBar} />
              <span className={styles.legendLabel}>High Flow</span>
            </div>
            <span className={styles.legendRight}>
              ⓘ Colors represent semantic similarity with the previous sentence.
            </span>
          </div>
        </div>

      </div>

      {/* ── Right panel ── */}
      <div className={styles.right}>
        <div className={styles.panel}>

          {/* Professionalism Score */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Professionalism Score <span className={styles.info}>ⓘ</span>
            </h3>
            <div className={styles.gaugeRow}>
              <svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={{ flexShrink: 0 }}>
                <circle
                  cx={GAUGE_SIZE / 2} cy={GAUGE_SIZE / 2} r={RADIUS}
                  fill="none" stroke="var(--color-border)" strokeWidth={STROKE_WIDTH}
                />
                <circle
                  cx={GAUGE_SIZE / 2} cy={GAUGE_SIZE / 2} r={RADIUS}
                  fill="none" stroke="var(--color-primary)" strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashoffset}
                  transform={`rotate(-90, ${GAUGE_SIZE / 2}, ${GAUGE_SIZE / 2})`}
                />
                <text
                  x={GAUGE_SIZE / 2} y={GAUGE_SIZE / 2 - 6}
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="Plus Jakarta Sans, sans-serif" fontSize={28} fontWeight={600}
                  fill="var(--color-text)"
                >
                  {PROF_SCORE}
                </text>
                <text
                  x={GAUGE_SIZE / 2} y={GAUGE_SIZE / 2 + 14}
                  textAnchor="middle"
                  fontFamily="Plus Jakarta Sans, sans-serif" fontSize={12}
                  fill="var(--color-muted)"
                >
                  /100
                </text>
              </svg>
              <div className={styles.gaugeText}>
                <p>Your writing shows a high level of professionalism.</p>
                <span className={styles.badge}>Academic level</span>
              </div>
            </div>
          </section>

          <div className={styles.divider} />

          {/* Genre Classification */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Genre Classification <span className={styles.info}>ⓘ</span>
            </h3>
            <div className={styles.genreList}>
              {GENRES.map((g) => (
                <div key={g.label} className={styles.genreItem}>
                  <div className={styles.genreHeader}>
                    <div className={styles.genreLabel}>
                      {g.icon}
                      <span>{g.label}</span>
                    </div>
                    <span className={styles.genrePct}>{g.pct}%</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.divider} />

          {/* Flow Breakpoints */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Flow Breakpoints <span className={styles.info}>ⓘ</span>
            </h3>
            <div className={styles.breakpointList}>
              {BREAKPOINTS.map((bp) => (
                <div key={bp.title} className={styles.breakpointItem}>
                  <span className={styles.dot} style={{ backgroundColor: bp.color }} />
                  <div className={styles.bpText}>
                    <span className={styles.bpTitle}>{bp.title}</span>
                    <span className={styles.bpDesc}>{bp.desc}</span>
                  </div>
                  <button className={styles.viewBtn}>View</button>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.divider} />

          <button className={styles.analyzeBtn} onClick={() => navigate('/analyze')}>Analyze My Text</button>

        </div>
      </div>

    </div>
  )
}
