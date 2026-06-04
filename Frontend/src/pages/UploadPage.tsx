import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Sparkles, PenLine, Upload,
  MessageCircle, Type, Info, Check, Lightbulb, ArrowRight,
  GraduationCap, Newspaper, ChevronDown,
} from 'lucide-react'
import styles from './UploadPage.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetricData {
  raw: number
  normalized: number
  professionalism: number
  level_probs: { Low: number; Middle: number; High: number }
  level: string
  feedback: string
}

interface GenreData {
  academic_paper: number
  magazine_editorial: number
  blog_casual: number
}

interface AnalysisResult {
  estimated_score: number
  estimated_level: string
  disclaimer: string
  metrics: Record<string, MetricData>
  genre: GenreData
}

// ─── Constants ───────────────────────────────────────────────────────────────

const METRIC_WEIGHTS_FE: Record<string, number> = {
  avg_word_length:        0.22,
  jargon_ratio:           0.11,
  avg_sentence_length:    0.22,
  passive_voice_ratio:    0.22,
  nominalization_ratio:   0.12,
  complex_sentence_ratio: 0.11,
}

const EXAMPLE_TEXT =
  'Artificial intelligence is transforming the way we live and work. ' +
  'It is being applied in healthcare, education, and many other fields. ' +
  'These advancements bring significant benefits to society. ' +
  'However, rapid AI development also raises ethical concerns. ' +
  'For example, issues like privacy and bias are becoming more serious. ' +
  'Therefore, responsible AI development and regulation are essential. ' +
  'In the future, humans and AI should work together for a better world.'

const CHECKLIST = [
  'Sentence-to-sentence semantic flow',
  'Topic shifts and weak transitions',
  'Professionalism score',
  'Genre classification',
]

const FLOW_COLORS = ['#FFCCBC', '#FFCCB2', '#FFF9C4', '#DCEDC8', '#C8E6C9', '#A5D6A7']

const METRIC_LABELS: Record<string, string> = {
  avg_word_length:        'Average Word Length',
  jargon_ratio:           'Jargon Ratio',
  avg_sentence_length:    'Average Sentence Length',
  passive_voice_ratio:    'Passive Voice Ratio',
  nominalization_ratio:   'Nominalization Ratio',
  complex_sentence_ratio: 'Complex Sentence Ratio',
}

const METRIC_FORMAT: Record<string, (raw: number) => string> = {
  avg_word_length:        (v) => v.toFixed(1),
  avg_sentence_length:    (v) => v.toFixed(1),
  jargon_ratio:           (v) => `${(v * 100).toFixed(1)}%`,
  passive_voice_ratio:    (v) => `${(v * 100).toFixed(1)}%`,
  nominalization_ratio:   (v) => `${(v * 100).toFixed(1)}%`,
  complex_sentence_ratio: (v) => `${(v * 100).toFixed(1)}%`,
}

function computeGenreFromMetrics(metrics: Record<string, MetricData>): GenreData {
  const keys = Object.keys(metrics).filter((k) => k in METRIC_WEIGHTS_FE)
  const totalWeight = keys.reduce((s, k) => s + METRIC_WEIGHTS_FE[k], 0)
  if (totalWeight === 0) {
    return { academic_paper: 33.3, magazine_editorial: 33.3, blog_casual: 33.4 }
  }
  const academic = keys.reduce((s, k) => s + metrics[k].level_probs.High   * METRIC_WEIGHTS_FE[k], 0) / totalWeight
  const magazine = keys.reduce((s, k) => s + metrics[k].level_probs.Middle * METRIC_WEIGHTS_FE[k], 0) / totalWeight
  const blog     = keys.reduce((s, k) => s + metrics[k].level_probs.Low    * METRIC_WEIGHTS_FE[k], 0) / totalWeight
  return {
    academic_paper:     Math.round(academic * 1000) / 10,
    magazine_editorial: Math.round(magazine * 1000) / 10,
    blog_casual:        Math.round(blog     * 1000) / 10,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FlowGauge({ score }: { score: number }) {
  const R = 32
  const C = 2 * Math.PI * R
  const offset = C * (1 - Math.min(Math.max(score, 0), 100) / 100)
  return (
    <svg width="84" height="84" viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={R} fill="none" stroke="#D4DCE4" strokeWidth="9" />
      <circle
        cx="42" cy="42" r={R}
        fill="none" stroke="#547A95" strokeWidth="9"
        strokeDasharray={C} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 42 42)"
      />
    </svg>
  )
}

function generateInsight(result: AnalysisResult): string {
  const { genre, estimated_level, metrics } = result
  if (!genre) {
    return 'Analysis complete. Review the metrics below for a detailed breakdown of your writing style.'
  }
  const sorted = (Object.entries(genre) as [keyof GenreData, number][]).sort(
    ([, a], [, b]) => b - a,
  )
  const [topKey, topPct] = sorted[0]
  const complexLevel = metrics.complex_sentence_ratio?.level
  const passiveLevel = metrics.passive_voice_ratio?.level
  const sentLevel = metrics.avg_sentence_length?.level

  if (topKey === 'academic_paper') {
    let t = `Your writing demonstrates strong academic characteristics (${topPct}%), featuring formal vocabulary and structured argumentation.`
    if (complexLevel === 'High') {
      t += ` Complex sentence structures are used effectively, though transitions between major sections could be smoother.`
    }
    if (passiveLevel === 'High') {
      t += ` The passive voice reinforces an objective, scholarly tone.`
    } else {
      t += ` Consider adding bridging sentences between key arguments to improve overall flow.`
    }
    return t
  }

  if (topKey === 'magazine_editorial') {
    let t = `Your writing has a balanced editorial voice (${topPct}%), combining accessibility with substantive content.`
    if (sentLevel === 'High') {
      t += ` Some sentences run long — varying sentence length can improve rhythm and reader engagement.`
    } else {
      t += ` The sentence rhythm feels natural and well-paced for editorial-style writing.`
    }
    t += ` Adding concrete examples or data points will strengthen the persuasive impact of your arguments.`
    return t
  }

  let t = `Your writing has a casual, conversational tone (${topPct}%) that is accessible to a broad audience.`
  if (metrics.jargon_ratio?.level === 'Low') {
    t += ` The minimal use of jargon keeps the content approachable.`
  }
  t += estimated_level === 'Low'
    ? ` To reach a professional audience, consider introducing domain-specific vocabulary and more complex sentence structures.`
    : ` Consider adding clearer transitions between ideas to elevate the overall professionalism of the piece.`
  return t
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [metricsOpen, setMetricsOpen] = useState(false)

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const sentenceCount = text.trim()
    ? text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
    : 0

  async function handleAnalyze() {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data: AnalysisResult = await res.json()
      if (!data.genre) {
        data.genre = computeGenreFromMetrics(data.metrics)
      }
      setResult(data)
      setMetricsOpen(false)
    } catch (err) {
      setError('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
      console.error(err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <div className={styles.logo}>
          <span className={styles.logoIcon}>C</span>
          <span className={styles.logoText}>ColoRead</span>
        </div>

        <div className={styles.navActions}>
          <button className={styles.loadBtn} onClick={() => setText(EXAMPLE_TEXT)}>
            <FileText size={15} />
            Load Example Text
          </button>
          <button
            className={`${styles.analyzeBtn} ${!text.trim() ? styles.analyzeBtnDisabled : ''}`}
            onClick={handleAnalyze}
            disabled={!text.trim()}
          >
            <Sparkles size={15} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <div className={styles.content}>

        {/* Left: Text Input Card */}
        <div className={styles.inputCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderLeft}>
              <h1 className={styles.cardTitle}>Try your document</h1>
              <p className={styles.cardDesc}>
                Paste your writing or upload a document to visualize how your ideas flow from sentence to sentence.
              </p>
            </div>
            <div className={styles.tabGroup}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'paste' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('paste')}
              >
                <PenLine size={14} />
                Paste Text
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'upload' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                <Upload size={14} />
                Upload File
              </button>
            </div>
          </div>

          <textarea
            className={styles.textarea}
            placeholder="Paste your essay, article, paragraph, or draft here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className={styles.statusBar}>
            <div className={styles.statusLeft}>
              <span className={styles.statusItem}>
                <MessageCircle size={14} />
                {sentenceCount} sentences detected
              </span>
              <span className={styles.statusItem}>
                <Type size={14} />
                {wordCount} words
              </span>
            </div>
            <button
              className={`${styles.statusAnalyzeBtn} ${!text.trim() ? styles.analyzeBtnDisabled : ''}`}
              onClick={handleAnalyze}
              disabled={!text.trim()}
            >
              <Sparkles size={14} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Right: Analysis Panel */}
        <div className={styles.previewPanel}>

          {result ? (
            /* ── Analysis Results ── */
            <>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Analysis Results</h3>
                <Info size={14} color="var(--color-muted)" />
              </div>

              <div className={styles.divider} />

              {/* ── Section 1: Overall Flow Score ── */}
              <p className={styles.resultSectionTitle}>Overall Flow Score</p>
              <div className={styles.scoreCard}>
                <div className={styles.scoreCardRow}>
                  <FlowGauge score={result.estimated_score} />
                  <div className={styles.scoreTextBlock}>
                    <span className={styles.scoreBig}>{result.estimated_score.toFixed(1)}</span>
                    <span className={styles.scoreSlash}>/100</span>
                  </div>
                  <div className={styles.scoreInfoBlock}>
                    <span className={styles.levelPill}>{result.estimated_level} Level</span>
                    <p className={styles.scoreDisclaimer}>{result.disclaimer}</p>
                  </div>
                </div>

                {/* Flow Spectrum */}
                <div className={styles.spectrumRow}>
                  <span className={styles.spectrumLabel}>Low</span>
                  <div className={styles.spectrumBarWrapper}>
                    <div
                      className={styles.spectrumGradient}
                      style={{ background: `linear-gradient(to right, ${FLOW_COLORS.join(', ')})` }}
                    />
                    <div
                      className={styles.spectrumDot}
                      style={{ left: `${Math.min(Math.max(result.estimated_score, 2), 98)}%` }}
                    />
                  </div>
                  <span className={styles.spectrumLabel}>High</span>
                </div>
              </div>

              <div className={styles.divider} />

              {/* ── Section 2: Writing Style ── */}
              <p className={styles.resultSectionTitle}>
                Writing Style
                <span className={styles.resultSectionSub}>&nbsp;(Genre Classification)</span>
              </p>
              <div className={styles.genreList}>
                <div className={styles.genreItem}>
                  <div className={styles.genreItemTop}>
                    <GraduationCap size={14} color="var(--color-primary)" />
                    <span className={styles.genreName}>Academic Paper</span>
                    <span className={styles.genrePct}>{result.genre.academic_paper.toFixed(1)}%</span>
                  </div>
                  <div className={styles.genreTrack}>
                    <div className={styles.genreFill} style={{ width: `${result.genre.academic_paper}%` }} />
                  </div>
                </div>
                <div className={styles.genreItem}>
                  <div className={styles.genreItemTop}>
                    <Newspaper size={14} color="var(--color-primary)" />
                    <span className={styles.genreName}>Magazine / Editorial</span>
                    <span className={styles.genrePct}>{result.genre.magazine_editorial.toFixed(1)}%</span>
                  </div>
                  <div className={styles.genreTrack}>
                    <div className={styles.genreFill} style={{ width: `${result.genre.magazine_editorial}%` }} />
                  </div>
                </div>
                <div className={styles.genreItem}>
                  <div className={styles.genreItemTop}>
                    <PenLine size={14} color="var(--color-primary)" />
                    <span className={styles.genreName}>Blog / Casual Writing</span>
                    <span className={styles.genrePct}>{result.genre.blog_casual.toFixed(1)}%</span>
                  </div>
                  <div className={styles.genreTrack}>
                    <div className={styles.genreFill} style={{ width: `${result.genre.blog_casual}%` }} />
                  </div>
                </div>
              </div>

              <div className={styles.divider} />

              {/* ── Section 3: AI Insight ── */}
              <div className={styles.insightCard}>
                <div className={styles.insightHeader}>
                  <Sparkles size={15} color="var(--color-primary)" />
                  <span className={styles.insightTitle}>AI Insight</span>
                </div>
                <p className={styles.insightBody}>{generateInsight(result)}</p>
              </div>

              <div className={styles.divider} />

              {/* ── Section 4: Writing Metrics Accordion ── */}
              <button
                className={styles.accordionToggle}
                onClick={() => setMetricsOpen((o) => !o)}
              >
                <span className={styles.accordionLabel}>Writing Metrics</span>
                <ChevronDown
                  size={16}
                  color="var(--color-muted)"
                  style={{
                    transform: metricsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              </button>
              {metricsOpen && (
                <div className={styles.metricsGrid}>
                  {Object.entries(result.metrics).map(([key, m]) => (
                    <div key={key} className={styles.metricMiniCard}>
                      <span className={styles.metricMiniName}>{METRIC_LABELS[key] ?? key}</span>
                      <span className={styles.metricMiniValue}>
                        {METRIC_FORMAT[key] ? METRIC_FORMAT[key](m.raw) : m.raw.toFixed(2)}
                      </span>
                      <div className={styles.metricMiniTrack}>
                        <div
                          className={styles.metricMiniFill}
                          style={{ width: `${m.professionalism}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Empty State ── */
            <>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Analysis Preview</h3>
                <Info size={14} color="var(--color-muted)" />
              </div>

              <div className={styles.divider} />

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={styles.emptyState}>
                <h4 className={styles.emptyTitle}>No document analyzed yet</h4>
                <p className={styles.emptyDesc}>
                  Paste your writing to generate flow colors, professionalism scores, and feedbacks.
                </p>
              </div>

              <div className={styles.divider} />

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  ColoRead will analyze
                  <Info size={13} color="var(--color-muted)" />
                </h3>
                <div className={styles.checklist}>
                  {CHECKLIST.map((item) => (
                    <div key={item} className={styles.checkItem}>
                      <div className={styles.checkIcon}>
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className={styles.divider} />

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  Flow Color Guide
                  <Info size={13} color="var(--color-muted)" />
                </h3>
                <div className={styles.colorBlocks}>
                  {FLOW_COLORS.map((color) => (
                    <div key={color} className={styles.colorBlock} style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className={styles.colorScale}>
                  <span className={styles.scaleLabel}>Low similarity</span>
                  <ArrowRight size={14} color="var(--color-muted)" />
                  <span className={styles.scaleLabel}>High similarity</span>
                </div>
                <div className={styles.colorLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#FFCCBC' }} />
                    <span>Red Color: weaker connection</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ backgroundColor: '#A5D6A7' }} />
                    <span>Blue Color: stronger connection</span>
                  </div>
                </div>
              </section>

              <div className={styles.divider} />

              <div className={styles.tip}>
                <div className={styles.tipHeader}>
                  <Lightbulb size={16} color="var(--color-primary)" />
                  <span className={styles.tipTitle}>Tip before analyzing</span>
                </div>
                <p className={styles.tipDesc}>
                  For the clearest result, paste at least one full paragraph with 5 or more sentences.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
