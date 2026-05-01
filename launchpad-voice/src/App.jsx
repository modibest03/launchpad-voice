import { useState } from 'react';
import styles from './App.module.css';
import Sidebar from './components/Sidebar';
import VoiceOrb from './components/VoiceOrb';
import Waveform from './components/Waveform';
import Transcript from './components/Transcript';
import InfoFields from './components/InfoFields';
import ContextReport from './components/ContextReport';
import ConnectionStatus from './components/ConnectionStatus';
import { useRealVoiceSession } from './hooks/useRealVoiceSession';
import { LANGUAGES, I18N } from './data/i18n';

export default function App() {
  const [lang, setLang] = useState('en');
  const [category, setCategory] = useState('immigration');
  const [view, setView] = useState('session');

  const {
    status, transcript, fields, context, error,
    start, stop, reset,
  } = useRealVoiceSession();

  const t = I18N[lang];
  const isActive  = status === 'speaking' || status === 'listening';
  const isConnecting = status === 'connecting';
  const isDone    = status === 'complete';
  const totalSteps = 8;
  const step = Math.round((transcript.length / 16) * totalSteps);

  function handleOrbClick() {
    if (isActive || isConnecting) { stop(); return; }
    if (status === 'idle') start(category, lang);
  }

  function handleCategoryChange(cat) {
    if (isActive) stop();
    reset();
    setCategory(cat);
  }

  const orbLabel = isConnecting ? 'Connecting...'
    : isActive ? (status === 'speaking' ? t.speaking : t.listening)
    : isDone   ? 'Session complete — generate context below'
    : t.tapStart;

  return (
    <div className={styles.app}>
      <header className={styles.topbar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
          </div>
          <div>
            <div className={styles.logoText}>Launchpad Voice</div>
            <div className={styles.logoSub}>Founder advisory intake</div>
          </div>
        </div>
        <div className={styles.langBar}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              className={[styles.langBtn, lang === l.code ? styles.langActive : ''].join(' ')}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        <Sidebar category={category} onCategory={handleCategoryChange} />
        <main className={styles.main}>
          {view === 'session' ? (
            <div className={styles.sessionPanel}>
              <div className={styles.sessionMeta}>
                <ConnectionStatus status={status} error={error} />
                <div className={styles.stepTrack}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={[
                      styles.stepPip,
                      i < step ? styles.stepDone : '',
                      i === step && isActive ? styles.stepCurrent : '',
                    ].join(' ')} />
                  ))}
                </div>
              </div>

              <VoiceOrb status={status} onClick={handleOrbClick} />
              <p className={styles.orbHint}>{orbLabel}</p>
              <Waveform active={isActive} />
              <Transcript messages={transcript} lang={lang} />
              <InfoFields fields={fields} />

              <div className={styles.actionRow}>
                <button
                  className={styles.btnDanger}
                  disabled={!isActive && !isConnecting}
                  onClick={stop}
                >
                  End
                </button>
                <button
                  className={styles.btnPrimary}
                  disabled={!isDone}
                  onClick={() => setView('report')}
                >
                  Generate advisor context →
                </button>
              </div>
            </div>
          ) : (
            <ContextReport
              category={category}
              lang={lang}
              liveContext={context}
              onBack={() => { reset(); setView('session'); }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
