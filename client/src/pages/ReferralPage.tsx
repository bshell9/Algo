import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const MA_CARRIERS = [
  'Arbella',
  'Safety Insurance',
  'Plymouth Rock',
  'MAPFRE / Commerce',
  'Liberty Mutual',
  'Progressive',
  'GEICO',
  'Travelers',
  'Allstate',
  'State Farm',
  'USAA',
  'Quincy Mutual',
  'Vermont Mutual',
  'Other',
];

const DAMAGE_TYPES = [
  'Windshield crack',
  'Windshield chip / rock chip',
  'Side window broken',
  'Back glass broken',
  'Sunroof / moonroof',
  'Other',
];

interface FormState {
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agencyName: string;
  customerName: string;
  customerPhone: string;
  customerZip: string;
  carrier: string;
  damage: string;
  notes: string;
  // honeypot
  website: string;
}

const EMPTY: FormState = {
  agentName: '',
  agentEmail: '',
  agentPhone: '',
  agencyName: '',
  customerName: '',
  customerPhone: '',
  customerZip: '',
  carrier: '',
  damage: '',
  notes: '',
  website: '',
};

const STORAGE_KEY = 'algo_agent_profile_v1';

function loadAgentProfile(): Partial<FormState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return {
      agentName: p.agentName || '',
      agentEmail: p.agentEmail || '',
      agentPhone: p.agentPhone || '',
      agencyName: p.agencyName || '',
    };
  } catch {
    return {};
  }
}

function saveAgentProfile(form: FormState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        agentName: form.agentName,
        agentEmail: form.agentEmail,
        agentPhone: form.agentPhone,
        agencyName: form.agencyName,
      }),
    );
  } catch {
    /* storage disabled — non-fatal */
  }
}

function formatPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function ReferralPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [returningAgent, setReturningAgent] = useState(false);
  const customerNameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = loadAgentProfile();
    if (saved.agentEmail) {
      setReturningAgent(true);
      setForm((f) => ({ ...f, ...saved }));
    }
  }, []);

  const update = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = k === 'agentPhone' || k === 'customerPhone' ? formatPhone(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
  };

  const requiredOk = useMemo(() => {
    return Boolean(
      form.agentName.trim()
      && /.+@.+\..+/.test(form.agentEmail.trim())
      && form.customerName.trim()
      && form.customerPhone.replace(/\D/g, '').length >= 10,
    );
  }, [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError(null);
    setStatus('submitting');
    try {
      const res = await axios.post('/api/referrals', {
        agentName: form.agentName.trim(),
        agentEmail: form.agentEmail.trim().toLowerCase(),
        agentPhone: form.agentPhone || null,
        agencyName: form.agencyName || null,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone,
        customerZip: form.customerZip || null,
        carrier: form.carrier || null,
        damage: form.damage || null,
        notes: form.notes || null,
        website: form.website,
      }, { timeout: 8000 });
      if (!res.data?.success) throw new Error('Submission failed');
      saveAgentProfile(form);
      setSubmittedAt(new Date());
      setStatus('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong. Please call us at (555) 555-0199.';
      setError(msg);
      setStatus('error');
    }
  };

  const sendAnother = () => {
    setForm((f) => ({
      ...EMPTY,
      agentName: f.agentName,
      agentEmail: f.agentEmail,
      agentPhone: f.agentPhone,
      agencyName: f.agencyName,
    }));
    setStatus('idle');
    setError(null);
    setSubmittedAt(null);
    setTimeout(() => customerNameRef.current?.focus(), 50);
  };

  if (status === 'success') {
    return <ConfirmationScreen onSendAnother={sendAnother} agentName={form.agentName} agentEmail={form.agentEmail} customerName={form.customerName} submittedAt={submittedAt} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Header />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:pt-10">
        <Hero />

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
          {returningAgent && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Welcome back, <span className="font-semibold">{form.agentName.split(' ')[0] || 'agent'}</span>. Your info is saved — just fill in the customer.
            </div>
          )}

          <Section title="You (the agent)">
            <Field label="Your name" required>
              <input
                className="input"
                type="text"
                autoComplete="name"
                required
                value={form.agentName}
                onChange={update('agentName')}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Your email" required hint="We'll send a confirmation here.">
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={form.agentEmail}
                onChange={update('agentEmail')}
                placeholder="jane@youragency.com"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Agency (optional)">
                <input
                  className="input"
                  type="text"
                  autoComplete="organization"
                  value={form.agencyName}
                  onChange={update('agencyName')}
                  placeholder="Smith Insurance"
                />
              </Field>
              <Field label="Your phone (optional)">
                <input
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.agentPhone}
                  onChange={update('agentPhone')}
                  placeholder="(617) 555-0123"
                />
              </Field>
            </div>
          </Section>

          <Divider />

          <Section title="Your customer">
            <Field label="Customer name" required>
              <input
                ref={customerNameRef}
                className="input"
                type="text"
                required
                value={form.customerName}
                onChange={update('customerName')}
                placeholder="John Smith"
              />
            </Field>
            <Field label="Customer phone" required hint="We'll contact them within 15 minutes during business hours.">
              <input
                className="input"
                type="tel"
                inputMode="tel"
                required
                value={form.customerPhone}
                onChange={update('customerPhone')}
                placeholder="(617) 555-0188"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Customer ZIP (optional)">
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={form.customerZip}
                  onChange={update('customerZip')}
                  placeholder="02134"
                />
              </Field>
              <Field label="Carrier (optional)">
                <select className="input" value={form.carrier} onChange={update('carrier')}>
                  <option value="">Select carrier</option>
                  {MA_CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Damage (optional)">
              <select className="input" value={form.damage} onChange={update('damage')}>
                <option value="">Select damage type</option>
                {DAMAGE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Anything else? (optional)">
              <textarea
                className="input min-h-[80px]"
                value={form.notes}
                onChange={update('notes')}
                placeholder="Mobile only, weekday mornings best, etc."
                maxLength={2000}
              />
            </Field>
          </Section>

          {/* Honeypot — invisible to humans, irresistible to bots */}
          <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>
              Leave this field empty
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={update('website')}
              />
            </label>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={!requiredOk || status === 'submitting'}
              className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800 active:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {status === 'submitting' ? 'Sending...' : 'Send Referral'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              No referral fees. No upsells. No marketing to your client.
            </p>
          </div>
        </form>

        <WhyAgentsUseUs />
        <WhatHappensNext />
        <Trust />
        <FooterNote />
      </main>

      <style>{`
        .input {
          display: block;
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.625rem;
          background: #fff;
          padding: 0.7rem 0.85rem;
          font-size: 1rem;
          line-height: 1.25rem;
          color: #111827;
          transition: border-color 120ms, box-shadow 120ms;
          -webkit-appearance: none;
        }
        .input:focus {
          outline: none;
          border-color: #047857;
          box-shadow: 0 0 0 3px rgba(4,120,87,0.18);
        }
        @media (max-width: 640px) {
          .input { font-size: 16px; } /* prevents iOS zoom-on-focus */
        }
      `}</style>
    </div>
  );
}

// ─── Components ───

function Header() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white font-bold">A</div>
          <div>
            <div className="text-sm font-semibold text-gray-900 leading-tight">AutoGlass Pod</div>
            <div className="text-xs text-gray-500 leading-tight">Massachusetts Agent Portal</div>
          </div>
        </div>
        <a href="tel:5555550199" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          (555) 555-0199
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section>
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> 30-second referral · Mobile friendly
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Refer a Glass Claim
      </h1>
      <p className="mt-2 text-base text-gray-600">
        We make glass claims easy for your client and invisible to you. We&apos;ll contact your customer within 15 minutes and handle the carrier from start to finish.
      </p>
      <p className="mt-3 text-sm font-medium text-emerald-800">
        We do not pay referral fees. Ever. No inducements, no conflicts — fully aligned with MA insurance ethics rules.
      </p>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-800">
        {label} {required && <span className="text-emerald-700">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function Divider() {
  return <div className="my-6 h-px w-full bg-gray-100" />;
}

function WhyAgentsUseUs() {
  const items = [
    { t: '15-minute first contact', d: 'We call your customer faster than the national chains, during business hours.' },
    { t: 'Carrier-direct billing', d: 'We work directly with the carrier and follow MA guidelines. No fights, no surprises.' },
    { t: 'Zero blowback to you', d: 'We don&apos;t upsell, don&apos;t bounce them around, and don&apos;t market to them after.' },
    { t: 'Written confirmation', d: 'You get an email receipt the moment we receive the referral — paper trail included.' },
  ];
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">Why MA agents send us their glass work</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.t} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">✓</div>
              <div>
                <div className="font-medium text-gray-900">{i.t}</div>
                <div className="mt-1 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: i.d }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhatHappensNext() {
  const steps = [
    { n: '1', t: 'You hit Send', d: 'Takes under 30 seconds. You go back to work.' },
    { n: '2', t: 'You get a confirmation email', d: 'Timestamped receipt with the customer name and our case number — for your file.' },
    { n: '3', t: 'We contact your customer', d: 'Within 15 minutes during business hours. Mobile or in-shop, their choice.' },
    { n: '4', t: 'We handle the carrier', d: 'Direct billing, EDI submission, deductible collected at the appointment.' },
  ];
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">What happens after you submit</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((s) => (
          <li key={s.n} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">{s.n}</div>
            <div>
              <div className="font-medium text-gray-900">{s.t}</div>
              <div className="mt-0.5 text-sm text-gray-600">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Trust() {
  return (
    <section className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
      <h2 className="text-base font-semibold text-emerald-900">Local, licensed, and boring (in a good way)</h2>
      <p className="mt-2 text-sm text-emerald-900/80">
        Massachusetts auto glass shops with mobile units serving the Greater Boston area, MetroWest, North Shore, South Shore, and Worcester County. We work directly with Arbella, Safety, Plymouth Rock, MAPFRE/Commerce, Liberty Mutual, Progressive, GEICO, Travelers, Allstate, and State Farm.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-emerald-900 sm:grid-cols-4">
        <li className="rounded-lg bg-white/70 px-3 py-2">MA glass shop</li>
        <li className="rounded-lg bg-white/70 px-3 py-2">EDI 837/835</li>
        <li className="rounded-lg bg-white/70 px-3 py-2">ADAS calibration</li>
        <li className="rounded-lg bg-white/70 px-3 py-2">Mobile + in-shop</li>
      </ul>
    </section>
  );
}

function FooterNote() {
  return (
    <p className="mt-8 text-center text-xs text-gray-500">
      Your client&apos;s information is used only to fulfill this glass claim. We don&apos;t cross-sell, don&apos;t add them to marketing lists, and don&apos;t contact them again after the job is done without your consent.
    </p>
  );
}

function ConfirmationScreen({
  onSendAnother,
  agentName,
  agentEmail,
  customerName,
  submittedAt,
}: {
  onSendAnother: () => void;
  agentName: string;
  agentEmail: string;
  customerName: string;
  submittedAt: Date | null;
}) {
  const ts = submittedAt
    ? submittedAt.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })
    : '';
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-10">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Got it. We&apos;re on it.</h1>
          <p className="mt-2 text-base text-gray-700">
            Thank you, <span className="font-semibold">{agentName.split(' ')[0] || 'agent'}</span>. We received your referral for <span className="font-semibold">{customerName}</span>.
          </p>
          <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Received</div>
                <div className="mt-0.5 font-medium text-gray-900">{ts || 'Just now'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500">Confirmation sent to</div>
                <div className="mt-0.5 font-medium text-gray-900 break-all">{agentEmail}</div>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-gray-700">
            <li className="flex gap-2"><span className="text-emerald-700">✓</span> We&apos;ll call your customer within 15 minutes (business hours).</li>
            <li className="flex gap-2"><span className="text-emerald-700">✓</span> We&apos;ll bill the carrier directly. No paperwork for you.</li>
            <li className="flex gap-2"><span className="text-emerald-700">✓</span> No upsells, no follow-up marketing, no contact after the job is done.</li>
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={onSendAnother} className="flex-1 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800">
              Send another referral
            </button>
            <a href="tel:5555550199" className="flex-1 rounded-xl border border-emerald-300 bg-white px-5 py-3 text-center font-semibold text-emerald-800 hover:bg-emerald-50">
              Call us instead
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Bookmark this page so it&apos;s one click next time.
        </p>
      </main>
    </div>
  );
}
