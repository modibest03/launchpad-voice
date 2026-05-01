import { useState } from 'react';
import styles from './ContextReport.module.css';
import { CONTEXT_DATA } from '../data/mockData';
import { LANGUAGES } from '../data/i18n';

const URGENCY_CLASS = { Critical: 'critical', High: 'high', Medium: 'medium' };

export default function ContextReport({ category, lang, onBack }) {
  const [copied, setCopied] = useState(false);
  const data = CONTEXT_DATA[category];
  const langName = LANGUAGES.find(l => l.code === lang)?.name || lang;

  function handleCopy() {
    const payload = {
      generatedAt: new Date().toISOString(),
      language: lang,
      founder: { name: data.name, company: data.company, stage: data.stage, nationality: data.nationality },
      issue: { category: data.category, subTopic: data.subTopic, urgency: data.urgency, complexity: data.complexity },
      summary: data.summary,
      recommendations: data.recommendations,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Advisor context — {data.name}</h2>
          <p className={styles.meta}>Generated just now · {data.category} · {langName}</p>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Ready for advisor
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Founder profile</div>
        <div className={styles.card}>
          {[['Name', data.name], ['Company', data.company], ['Stage', data.stage], ['Nationality', data.nationality], ['Session language', langName]].map(([k, v]) => (
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
          {[['Category', data.category], ['Sub-topic', data.subTopic], ['Complexity', data.complexity]].map(([k, v]) => (
            <div key={k} className={styles.row}>
              <span className={styles.key}>{k}</span>
              <span className={styles.val}>{v}</span>
            </div>
          ))}
          <div className={styles.row}>
            <span className={styles.key}>Urgency</span>
            <span className={[styles.urgency, styles[URGENCY_CLASS[data.urgency] || 'medium']].join(' ')}>
              {data.urgency}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Session summary</div>
        <div className={styles.card}>
          <p className={styles.summary}>{data.summary}</p>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Advisor recommendations</div>
        <div className={styles.recList}>
          {data.recommendations.map((r, i) => (
            <div key={i} className={styles.recItem}>
              <div className={styles.recNum}>{i + 1}</div>
              <p className={styles.recText}>{r}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnBack} onClick={onBack}>← New session</button>
        <button className={[styles.btn, styles.btnPrimary].join(' ')} onClick={handleCopy}>
          {copied ? 'Copied ✓' : 'Copy context JSON'}
        </button>
      </div>
    </div>
  );
}
