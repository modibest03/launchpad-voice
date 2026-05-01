import styles from './VoiceOrb.module.css';

export default function VoiceOrb({ status, onClick }) {
  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const isActive = isSpeaking || isListening;

  return (
    <div className={styles.wrap} onClick={onClick}>
      <div className={[
        styles.orb,
        isSpeaking ? styles.speaking : '',
        isListening ? styles.listening : '',
      ].join(' ')}>
        {isActive ? (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            {isSpeaking ? (
              <>
                <rect x="3" y="9" width="3" height="6" rx="1.5" fill="white" opacity="0.7" />
                <rect x="8" y="6" width="3" height="12" rx="1.5" fill="white" />
                <rect x="13" y="8" width="3" height="8" rx="1.5" fill="white" opacity="0.85" />
                <rect x="18" y="10" width="3" height="4" rx="1.5" fill="white" opacity="0.6" />
              </>
            ) : (
              <path fill="white" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H6c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-2.07z"/>
            )}
          </svg>
        ) : (
          <svg width="38" height="38" viewBox="0 0 24 24">
            <path fill="var(--accent)" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93H6c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h3v2H9v-2h3v-2.07z"/>
          </svg>
        )}
      </div>
    </div>
  );
}
