import styles from './Sidebar.module.css';
import { CATEGORIES } from '../data/mockData';

export default function Sidebar({ category, onCategory }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionLabel}>Category</div>
      {CATEGORIES.map(c => (
        <button
          key={c.id}
          className={[styles.item, category === c.id ? styles.active : ''].join(' ')}
          onClick={() => onCategory(c.id)}
        >
          <span className={styles.dot} style={{ background: c.color }} />
          {c.label}
        </button>
      ))}

      <div className={styles.sectionLabel} style={{ marginTop: 16 }}>Recent</div>
      {[{ time: 'Today, 09:14', cat: 'Immigration' }, { time: 'Yesterday, 15:40', cat: 'Banking' }].map((s, i) => (
        <div key={i} className={styles.histItem}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <div>
            <div className={styles.histTime}>{s.time}</div>
            <div className={styles.histCat}>{s.cat}</div>
          </div>
        </div>
      ))}
    </aside>
  );
}
