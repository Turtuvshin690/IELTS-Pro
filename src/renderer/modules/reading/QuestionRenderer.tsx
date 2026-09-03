import React from 'react';

export type Question = {
  id: string;
  qType: string;
  prompt: string;
  options?: unknown;
  answer?: unknown;
};

type Props = {
  question: Question;
  value: string;
  onChange: (id: string, value: string) => void;
  qNum?: number;
  isFlagged?: boolean;
  onToggleFlag?: (id: string) => void;
};

function parseOptions(options: unknown): string[] {
  if (!options) return [];
  if (Array.isArray(options)) return options.map((o) => String(o));
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed.map((o) => String(o));
      return [String(parsed)];
    } catch {
      return options.split('|').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function parsePrompt(prompt: unknown): string {
  if (typeof prompt === 'string') {
    try {
      const j = JSON.parse(prompt);
      if (typeof j === 'string') return j;
      if (j != null) return String(j);
    } catch {
      // not JSON
    }
    return prompt;
  }
  if (prompt == null) return '';
  return String(prompt);
}

function CompletionPrompt({
  text,
  value,
  onChange,
}: {
  text: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  // Split on common blank markers: ........  _____  ___  ……
  const parts = text.split(/(\.{4,}|_{3,}|…{2,})/g);
  if (parts.length === 1) {
    return (
      <span>
        {text}{' '}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mx-1 inline-block h-6 w-36 rounded-[2px] border border-zinc-500 bg-white px-2 text-[13px] text-zinc-900 outline-none focus:border-zinc-900"
        />
      </span>
    );
  }
  return (
    <span>
      {parts.map((p, i) => {
        if (/^(\.{4,}|_{3,}|…{2,})$/.test(p)) {
          return (
            <input
              key={i}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mx-1 inline-block h-6 w-36 rounded-[2px] border border-zinc-500 bg-white px-2 text-[13px] text-zinc-900 outline-none focus:border-zinc-900"
            />
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

export default function QuestionRenderer({
  question,
  value,
  onChange,
  qNum,
}: Props): JSX.Element {
  const { id, qType, prompt, options } = question;
  const text = parsePrompt(prompt);
  const opts = parseOptions(options);

  const handle = (v: string) => onChange(id, v);

  return (
    <div id={`question-${id}`} data-testid={`question-item-${id}`} className="py-1">
      {/* Engnovate-style: [num box] prompt text inline */}
      <div className="flex items-start gap-2 text-[13.5px] leading-[1.7] text-zinc-900">
        {qNum !== undefined && (
          <span className="mt-[3px] inline-flex h-[22px] min-w-[24px] shrink-0 items-center justify-center border border-zinc-800 px-1 text-[12px] font-bold leading-none">
            {qNum}
          </span>
        )}
        <div className="flex-1">
          {(() => {
            const t = qType;
            const isCompletion =
              t === 'SENTENCE_COMPLETION' ||
              t === 'SUMMARY_COMPLETION' ||
              t === 'NOTE_COMPLETION' ||
              t === 'TABLE_COMPLETION' ||
              t === 'FLOW_CHART' ||
              t === 'DIAGRAM_LABEL' ||
              t === 'SHORT_ANSWER' ||
              t === 'MAP_LABEL' ||
              t === 'FORM_COMPLETION';
            if (isCompletion && !opts.length) {
              return <CompletionPrompt text={text} value={value} onChange={handle} />;
            }
            // Strip leading Q-number like "Q31 — ..." since we already show the box
            const cleaned = text.replace(/^Q\s?\d+\s*[—–-]\s*/i, '');
            return <span>{cleaned}</span>;
          })()}
        </div>
      </div>

      {/* Engnovate-style controls */}
      {(() => {
        switch (qType) {
          case 'MCQ':
          case 'MCQ_MULTI': {
            const list = opts.length ? opts : [];
            if (!list.length) return null;
            const selectedMulti = value ? value.split(',').map((s) => s.trim()) : [];
            return (
              <div className="mt-1 space-y-0.5 pl-8">
                {list.map((opt, idx) => {
                  const letterMatch = opt.match(/^([A-Z])[\s.)\-:]/);
                  const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + idx);
                  const label = letterMatch ? opt.slice(letterMatch[0].length).trim() : opt;
                  const isMulti = qType === 'MCQ_MULTI';
                  const isChecked = isMulti
                    ? selectedMulti.includes(letter)
                    : value === opt || value === letter;
                  const toggle = () => {
                    if (isMulti) {
                      const next = selectedMulti.includes(letter)
                        ? selectedMulti.filter((x) => x !== letter)
                        : [...selectedMulti, letter];
                      handle(next.join(', '));
                    } else {
                      handle(letterMatch ? letter : opt);
                    }
                  };
                  return (
                    <label key={opt} className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-zinc-900">
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[11px] font-bold text-zinc-800">
                        {letter}
                      </span>
                      <input
                        type={isMulti ? 'checkbox' : 'radio'}
                        name={isMulti ? undefined : id}
                        checked={isChecked}
                        onChange={toggle}
                        className="h-4 w-4 shrink-0 accent-zinc-800"
                      />
                      <span className="leading-snug">{label || opt}</span>
                    </label>
                  );
                })}
              </div>
            );
          }

          case 'TFNG':
          case 'YNNG': {
            const defaults = qType === 'TFNG' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN'];
            const rawList = opts.length ? opts : defaults;
            // Normalize to [letter, label] — screenshots show A TRUE / B FALSE / C NOT GIVEN
            const list = rawList.slice(0, 3).map((opt, idx) => {
              const m = opt.match(/^([A-C])[\s.)\-:]+(.*)$/i);
              if (m) return { letter: m[1].toUpperCase(), label: m[2].trim() };
              return { letter: String.fromCharCode(65 + idx), label: opt };
            });
            return (
              <div className="mt-1 space-y-0.5 pl-8">
                {list.map(({ letter, label }) => {
                  const isChecked =
                    value.toLowerCase().trim() === label.toLowerCase().trim() ||
                    value.toUpperCase().trim() === letter;
                  return (
                    <label key={letter} className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-zinc-900">
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-zinc-300 text-[11px] font-bold text-zinc-800">
                        {letter}
                      </span>
                      <input
                        type="radio"
                        name={id}
                        checked={isChecked}
                        onChange={() => handle(label)}
                        className="h-4 w-4 shrink-0 accent-zinc-800"
                      />
                      <span className="uppercase tracking-wide">{label}</span>
                    </label>
                  );
                })}
              </div>
            );
          }

          case 'MATCHING_INFORMATION':
          case 'MATCHING_HEADINGS':
          case 'MATCH_HEADING':
          case 'MATCHING_FEATURES':
          case 'MATCH_FEATURE':
          case 'MATCHING_SENTENCE_ENDINGS': {
            if (!opts.length) {
              return (
                <div className="mt-1 pl-8">
                  <input
                    className="h-7 w-44 rounded-[2px] border border-zinc-500 px-2 text-[13px] outline-none focus:border-zinc-900"
                    value={value}
                    onChange={(e) => handle(e.target.value)}
                    placeholder=""
                  />
                </div>
              );
            }
            return (
              <div className="mt-1 pl-8">
                <select
                  className="h-7 min-w-[220px] max-w-full rounded-[2px] border border-zinc-500 bg-white px-2 text-[13px] text-zinc-900 outline-none focus:border-zinc-900"
                  value={value}
                  onChange={(e) => handle(e.target.value)}
                >
                  <option value="">Select</option>
                  {opts.map((opt) => (
                    <option key={opt} value={opt.match(/^([A-Za-z0-9]+)[\s.)\]]/)?.[1] || opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          case 'SENTENCE_COMPLETION':
          case 'SUMMARY_COMPLETION':
          case 'NOTE_COMPLETION':
          case 'TABLE_COMPLETION':
          case 'FLOW_CHART':
          case 'DIAGRAM_LABEL':
          case 'SHORT_ANSWER':
          case 'MAP_LABEL':
          case 'FORM_COMPLETION':
          default: {
            // Inline input already rendered in prompt; render dropdown only when options exist
            if (opts.length > 0) {
              return (
                <div className="mt-1 pl-8">
                  <select
                    className="h-7 min-w-[220px] max-w-full rounded-[2px] border border-zinc-500 bg-white px-2 text-[13px] outline-none"
                    value={value}
                    onChange={(e) => handle(e.target.value)}
                  >
                    <option value="">Select</option>
                    {opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            return null;
          }
        }
      })()}
    </div>
  );
}
