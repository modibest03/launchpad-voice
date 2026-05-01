import { useState, useRef, useCallback } from 'react';
import { MOCK_DIALOGUE } from '../data/mockData';
import { I18N } from '../data/i18n';

export function useVoiceSession() {
  const [status, setStatus] = useState('idle'); // idle | speaking | listening | complete
  const [transcript, setTranscript] = useState([]);
  const [fields, setFields] = useState({ founder: '', company: '', issue: '', urgency: '' });
  const [step, setStep] = useState(0);
  const timeoutRef = useRef(null);
  const stepRef = useRef(0);

  const addMessage = useCallback((role, text) => {
    setTranscript(prev => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  const start = useCallback((category, lang) => {
    setStatus('speaking');
    setTranscript([]);
    setFields({ founder: '', company: '', issue: '', urgency: '' });
    setStep(0);
    stepRef.current = 0;

    const t = I18N[lang];
    addMessage('agent', t.greeting);

    const steps = MOCK_DIALOGUE[category];

    function runStep() {
      const i = stepRef.current;
      if (i >= steps.length) {
        setStatus('complete');
        return;
      }
      const s = steps[i];
      stepRef.current = i + 1;
      setStep(i + 1);

      const delay = s.role === 'agent' ? 1600 : 1200 + Math.random() * 800;
      timeoutRef.current = setTimeout(() => {
        if (s.role === 'user') {
          setStatus('listening');
          addMessage('user', s.text);
          if (s.fields) {
            setFields(prev => ({ ...prev, ...s.fields }));
          }
        } else {
          setStatus('speaking');
          addMessage('agent', t[s.key]);
        }
        runStep();
      }, delay);
    }

    timeoutRef.current = setTimeout(runStep, 1200);
  }, [addMessage]);

  const stop = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('idle');
    setTranscript([]);
    setFields({ founder: '', company: '', issue: '', urgency: '' });
    setStep(0);
    stepRef.current = 0;
  }, []);

  return { status, transcript, fields, step, start, stop, reset };
}
