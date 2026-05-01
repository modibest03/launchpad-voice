import { useEffect, useRef } from 'react';
import styles from './Waveform.module.css';

export default function Waveform({ active }) {
  const barsRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      barsRef.current.forEach(b => { if (b) { b.style.height = '4px'; b.style.opacity = '0.25'; } });
      return;
    }
    function animate() {
      barsRef.current.forEach(b => {
        if (!b) return;
        const h = 4 + Math.random() * 28;
        b.style.height = h + 'px';
        b.style.opacity = String(0.4 + Math.random() * 0.6);
      });
      rafRef.current = setTimeout(animate, 100);
    }
    animate();
    return () => { if (rafRef.current) clearTimeout(rafRef.current); };
  }, [active]);

  return (
    <div className={styles.wrap}>
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className={styles.bar} ref={el => barsRef.current[i] = el} />
      ))}
    </div>
  );
}
