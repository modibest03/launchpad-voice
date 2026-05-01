import styles from './InfoFields.module.css';

const FIELD_META = [
  { key: 'founder', label: 'Founder name' },
  { key: 'company', label: 'Company' },
  { key: 'issue',   label: 'Primary issue' },
  { key: 'urgency', label: 'Urgency' },
];

export default function InfoFields({ fields }) {
  return (
    <div className={styles.grid}>
      {FIELD_META.map(f => (
        <div key={f.key} className={[styles.field, fields[f.key] ? styles.filled : ''].join(' ')}>
          <span className={styles.label}>{f.label}</span>
          <span className={[styles.value, !fields[f.key] ? styles.empty : ''].join(' ')}>
            {fields[f.key] || 'Gathering...'}
          </span>
        </div>
      ))}
    </div>
  );
}
