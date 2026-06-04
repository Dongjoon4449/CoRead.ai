import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText, Sparkles, PenLine, Upload,
  MessageCircle, Type, Info, Check, Lightbulb, ArrowRight,
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

interface AnalysisResult {
  estimated_score: number
  estimated_level: string
  disclaimer: string
  metrics: Record<string, MetricData>
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const LEVEL_COLOR: Record<string, string> = {
  High:   'var(--status-success)',
  Middle: 'var(--status-warning)',
  Low:    'var(--status-danger)',
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      setResult(data)
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

        {/* Right: Analysis Preview Panel */}
        <div className={styles.previewPanel}>

          {result ? (
            /* ── Analysis Results ── */
            <>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Analysis Results</h3>
                <Info size={14} color="var(--color-muted)" />
              </div>

              <div className={styles.divider} />

              {/* Score summary */}
              <div className={styles.scoreRow}>
                <div className={styles.scoreNum}>
                  <span className={styles.scoreValue}>{result.estimated_score.toFixed(1)}</span>
                  <span className={styles.scoreUnit}>/100</span>
                </div>
                <div className={styles.scoreRight}>
                  <span
                    className={styles.levelBadge}
                    style={{ color: LEVEL_COLOR[result.estimated_level] ?? 'var(--color-muted)' }}
                  >
                    {result.estimated_level} level
                  </span>
                  <p className={styles.disclaimer}>{result.disclaimer}</p>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Per-metric breakdown */}
              <div className={styles.metricList}>
                {Object.entries(result.metrics).map(([key, m]) => (
                  <div key={key} className={styles.metricItem}>
                    <div className={styles.metricHeader}>
                      <span className={styles.metricName}>{METRIC_LABELS[key] ?? key}</span>
                      <span className={styles.metricScore}>{m.professionalism.toFixed(1)}%</span>
                    </div>
                    <div className={styles.metricTrack}>
                      <div
                        className={styles.metricFill}
                        style={{ width: `${m.professionalism}%` }}
                      />
                    </div>
                    <p className={styles.metricFeedback}>{m.feedback}</p>
                  </div>
                ))}
              </div>
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
