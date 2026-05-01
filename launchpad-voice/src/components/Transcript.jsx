import { useEffect, useRef } from 'react';
import styles from './Transcript.module.css';
import { I18N } from '../data/i18n';

export default function Transcript({ messages, lang }) {
  const bottomRef = useRef(null);
  const t = I18N[lang];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={styles.box}>
        <p className={styles.empty}>Conversation will appear here once the session starts.</p>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      {messages.map(msg => (
        <div key={msg.id} className={[styles.msg, styles[msg.role]].join(' ')}>
          <span className={styles.role}>{msg.role === 'agent' ? t.agent : t.founder}</span>
          <p className={styles.text}>{msg.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
