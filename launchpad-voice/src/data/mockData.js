export const CATEGORIES = [
  { id: 'immigration', label: 'Immigration', color: '#378ADD', bg: '#E6F1FB' },
  { id: 'compliance',  label: 'Compliance',  color: '#BA7517', bg: '#FAEEDA' },
  { id: 'banking',     label: 'Banking',     color: '#1D9E75', bg: '#E1F5EE' },
];

export const MOCK_DIALOGUE = {
  immigration: [
    { role: 'user', text: "Hi, I'm Amara Diallo, co-founder of Veza Health.", fields: { founder: 'Amara Diallo', company: 'Veza Health' } },
    { role: 'agent', key: 'q1' },
    { role: 'user', text: "My O-1A visa expires in 6 weeks. My attorney says we need extraordinary ability evidence but isn't moving fast enough.", fields: { issue: 'O-1A Visa Renewal · 6 weeks' } },
    { role: 'agent', key: 'q2' },
    { role: 'user', text: "Very urgent — I have a key investor meeting next month and can't risk travel restrictions.", fields: { urgency: 'Critical · 6 weeks' } },
    { role: 'agent', key: 'q3' },
    { role: 'user', text: "Yes, but they're overwhelmed and unresponsive. That's why I'm here." },
    { role: 'agent', key: 'q4' },
  ],
  compliance: [
    { role: 'user', text: "My name is Carlos Mendes, I run Finblox — a fintech operating in Brazil and the US.", fields: { founder: 'Carlos Mendes', company: 'Finblox' } },
    { role: 'agent', key: 'q1' },
    { role: 'user', text: "We just received an SEC comment letter questioning whether our token is a security under the Howey Test.", fields: { issue: 'SEC Token Classification' } },
    { role: 'agent', key: 'q2' },
    { role: 'user', text: "30-day response window is active. Enforcement action if ignored.", fields: { urgency: 'High · 30 days' } },
    { role: 'agent', key: 'q3' },
    { role: 'user', text: "Not yet — we were hoping to get the right specialist before engaging anyone." },
    { role: 'agent', key: 'q4' },
  ],
  banking: [
    { role: 'user', text: "I'm Yuki Tanaka, building Flowcast — a cross-border payments startup.", fields: { founder: 'Yuki Tanaka', company: 'Flowcast' } },
    { role: 'agent', key: 'q1' },
    { role: 'user', text: "Our Mercury account was frozen immediately after a $2M Series A wire. No explanation given.", fields: { issue: 'Account Freeze · $2M wire' } },
    { role: 'agent', key: 'q2' },
    { role: 'user', text: "Critical. We can't pay salaries in 9 days if this isn't resolved.", fields: { urgency: 'Critical · 9 days' } },
    { role: 'agent', key: 'q3' },
    { role: 'user', text: "We have a lawyer on standby but Mercury support is completely unresponsive." },
    { role: 'agent', key: 'q4' },
  ],
};

export const CONTEXT_DATA = {
  immigration: {
    name: 'Amara Diallo', company: 'Veza Health', stage: 'Series A', nationality: 'Guinean',
    category: 'Immigration', subTopic: 'O-1A Visa Renewal', urgency: 'Critical', complexity: 'High',
    summary: 'Founder is a Guinean national on an O-1A visa expiring in 6 weeks. Current immigration attorney is overwhelmed and unresponsive. Founder has an upcoming investor meeting and cannot risk travel complications or lapses in status. Needs an expedited extraordinary ability documentation strategy and a responsive attorney.',
    recommendations: [
      'Engage a specialized O-1A attorney with startup founder experience within 48 hours.',
      'Compile extraordinary ability evidence: press coverage, investor letters, patents, revenue traction.',
      'File premium processing (Form I-907) to cut USCIS review time to ~15 business days.',
      'Draft a travel advisory memo for investors explaining potential status constraints.',
    ],
  },
  compliance: {
    name: 'Carlos Mendes', company: 'Finblox', stage: 'Seed+', nationality: 'Brazilian',
    category: 'Compliance', subTopic: 'SEC Token Classification', urgency: 'High', complexity: 'Very High',
    summary: "Founder received an SEC comment letter questioning whether the company's token constitutes a security under the Howey Test. A 30-day response window is active. No specialist legal representation has been engaged yet. Risk of formal enforcement action if the deadline is missed or the response is inadequate.",
    recommendations: [
      'Retain a securities attorney specializing in digital asset regulation within 48 hours.',
      'Prepare a Howey Test analysis memo detailing token utility and decentralization evidence.',
      'Document all token distribution mechanics to establish non-investment intent.',
      'Consider requesting a 30-day extension from the SEC while legal representation is secured.',
    ],
  },
  banking: {
    name: 'Yuki Tanaka', company: 'Flowcast', stage: 'Series A', nationality: 'Japanese',
    category: 'Banking', subTopic: 'Account Freeze / AML Flag', urgency: 'Critical', complexity: 'Medium',
    summary: "Founder's Mercury business account was frozen immediately following a $2M Series A wire. No explanation was provided by the bank. Payroll deadline is 9 days away. Founder has legal counsel on standby. The freeze was likely triggered by an automated AML/SAR flag on the large inbound wire.",
    recommendations: [
      'File a formal written inquiry to Mercury compliance via certified mail today.',
      'Have legal counsel send a formal demand letter requesting restoration within 72 hours.',
      'Open an emergency backup account with Brex or Arc immediately for payroll continuity.',
      'Prepare Series A documentation (term sheet, investor letter) to clear the AML flag.',
    ],
  },
};
