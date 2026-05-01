import styles from './ConnectionStatus.module.css';

const LABELS = {
  idle: 'Ready',
  connecting: 'Connecting...',
  listening: 'Listening',
  speaking: 'Agent speaking',
  complete: 'Session complete',
};

const COLORS = {
  idle: 'idle',
  connecting: 'warn',
  listening: 'active',
  speaking: 'active',
  complete: 'done',
};

export default function ConnectionStatus({ status, error }) {
  return (
    <div className={styles.wrap}>
      <span className={[styles.dot, styles[COLORS[status] || 'idle']].join(' ')} />
      <span className={styles.label}>{error ? `Error: ${error}` : LABELS[status] || status}</span>
    </div>
  );
}
