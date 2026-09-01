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

export default function QuestionRenderer({ question, value, onChange }: Props): JSX.Element {
  const { id, qType, prompt, options } = question;
  const text = parsePrompt(prompt);
  const opts = parseOptions(options);

  const handle = (v: string) => onChange(id, v);

  switch (qType) {
    case 'MCQ': {
      const list = opts.length ? opts : [];
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          <div className="space-y-1">
            {list.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handle(e.target.value)}
                />
                <span>{opt}</span>
              </label>
            ))}
            {list.length === 0 && (
              <input
                className="w-full rounded border px-2 py-1 text-sm"
                value={value}
                onChange={(e) => handle(e.target.value)}
                placeholder="Enter answer"
              />
            )}
          </div>
        </div>
      );
    }
    case 'TFNG': {
      const tfng = opts.length ? opts : ['True', 'False', 'Not Given'];
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          <div className="flex gap-4">
            {tfng.map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  checked={value.toLowerCase().trim() === opt.toLowerCase().trim()}
                  onChange={(e) => handle(e.target.value)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'YNNG': {
      const ynng = opts.length ? opts : ['Yes', 'No', 'Not Given'];
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          <div className="flex gap-4">
            {ynng.map((opt) => (
              <label key={opt} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={id}
                  value={opt}
                  checked={value.toLowerCase().trim() === opt.toLowerCase().trim()}
                  onChange={(e) => handle(e.target.value)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    case 'MATCH_HEADING':
    case 'MATCH_FEATURE': {
      const list = opts;
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          {list.length ? (
            <select
              className="w-full rounded border px-2 py-1 text-sm"
              value={value}
              onChange={(e) => handle(e.target.value)}
            >
              <option value="">-- Select --</option>
              {list.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              value={value}
              onChange={(e) => handle(e.target.value)}
              placeholder="Enter heading/feature"
            />
          )}
        </div>
      );
    }
    case 'SENTENCE_COMPLETION':
    case 'SUMMARY_COMPLETION':
    case 'DIAGRAM_LABEL':
    case 'SHORT_ANSWER':
    case 'MAP_LABEL':
    case 'FORM_COMPLETION': {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          {opts.length > 0 ? (
            <select
              className="w-full rounded border px-2 py-1 text-sm"
              value={value}
              onChange={(e) => handle(e.target.value)}
            >
              <option value="">-- Select --</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full rounded border px-2 py-1 text-sm"
              value={value}
              onChange={(e) => handle(e.target.value)}
              placeholder="Type your answer"
            />
          )}
          {qType === 'SHORT_ANSWER' && <p className="text-xs text-gray-400">No more than three words</p>}
        </div>
      );
    }
    default: {
      // fallback for unknown types
      if (opts.length) {
        return (
          <div className="space-y-2">
            <p className="text-sm font-medium">{text}</p>
            <select
              className="w-full rounded border px-2 py-1 text-sm"
              value={value}
              onChange={(e) => handle(e.target.value)}
            >
              <option value="">-- Select --</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{text}</p>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={value}
            onChange={(e) => handle(e.target.value)}
            placeholder="Type your answer"
          />
        </div>
      );
    }
  }
}
