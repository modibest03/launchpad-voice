import { useState } from 'react';
import styles from './ContextReport.module.css';
import { LANGUAGES } from '../data/i18n';

const URGENCY_CLASS = { Critical: 'critical', High: 'high', Medium: 'medium' };

function get(obj, ...paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let val = obj;
    for (const p of parts) val = val?.[p];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return null;
}

export default function ContextReport({ category, lang, liveContext, onBack }) {
  const [copied, setCopied] = useState(false);
  const langName = LANGUAGES.find(l => l.code === lang)?.name || lang;

  // Use liveContext from real session — never fall back to mock data
  const ctx = liveContext || {};
  const founder = ctx.founder || {};
  const issue   = ctx.issue   || {};
  const recs    = ctx.advisor_recommendations || ctx.recommendations || [];
  const summary = ctx.summary || ctx.transcript_summary || '';
  const transcript = ctx.transcript || [];

  const name       = get(founder, 'name')        || '—';
  const company    = get(founder, 'company')      || '—';
  const stage      = get(founder, 'stage')        || '—';
  const nationality= get(founder, 'nationality', 'incorporation_country') || '—';
  const catLabel   = get(issue, 'type', 'category') || category || '—';
  const subTopic   = get(issue, 'subTopic', 'sub_topic', 'description') || '—';
  const urgency    = get(ctx, 'urgency_score')
    ? scoreToLabel(ctx.urgency_score)
    : get(issue, 'urgency') || '—';
  const complexity = get(issue, 'complexity', 'enforcement_risk') || '—';

  function scoreToLabel(score) {
    if (score >= 9) return 'Critical';
    if (score >= 7) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  }

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(ctx, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!liveContext) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>No session data</h2>
            <p className={styles.meta}>Complete a voice session to generate the advisor brief.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnBack} onClick={onBack}>← New session</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Advisor context — {name}</h2>
          <p className={styles.meta}>
            Generated just now · {category.charAt(0).toUpperCase() + category.slice(1)} · {langName}
          </p>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Ready for advisor
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Founder profile</div>
        <div className={styles.card}>
          {[
            ['Name', name],
            ['Company', company],
            ['Stage', stage],
            ['Nationality', nationality],
            ['Session language', langName],
          ].map(([k, v]) => (
            <div key={k} className={styles.row}>
              <span className={styles.key}>{k}</span>
              <span className={styles.val}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Issue classification</div>
        <div className={styles.card}>
          {[
            ['Category', category.charAt(0).toUpperCase() + category.slice(1)],
            ['Sub-topic', subTopic],
            ['Complexity', complexity],
          ].map(([k, v]) => (
            <div key={k} className={styles.row}>
              <span className={styles.key}>{k}</span>
              <span className={styles.val}>{v}</span>
            </div>
          ))}
          <div className={styles.row}>
            <span className={styles.key}>Urgency</span>
            {urgency !== '—' ? (
              <span className={[styles.urgency, styles[URGENCY_CLASS[urgency] || 'medium']].join(' ')}>
                {urgency}
              </span>
            ) : (
              <span className={styles.val}>—</span>
            )}
          </div>
        </div>
      </div>

      {summary && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Session summary</div>
          <div className={styles.card}>
            <p className={styles.summary}>{summary}</p>
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Advisor recommendations</div>
          <div className={styles.recList}>
            {recs.map((r, i) => (
              <div key={i} className={styles.recItem}>
                <div className={styles.recNum}>{i + 1}</div>
                <p className={styles.recText}>{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {transcript.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Session transcript</div>
          <div className={styles.card}>
            {transcript.map((msg, i) => (
              <div key={i} className={styles.txRow}>
                <span className={[styles.txRole, msg.role === 'user' ? styles.txUser : styles.txAgent].join(' ')}>
                  {msg.role === 'user' ? 'Founder' : 'Agent'}
                </span>
                <p className={styles.txText}>{msg.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.btnBack} onClick={onBack}>← New session</button>
        <button className={[styles.btn, styles.btnPrimary].join(' ')} onClick={handleCopy}>
          {copied ? 'Copied ✓' : 'Copy context JSON'}
        </button>
      </div>
    </div>
  );
}