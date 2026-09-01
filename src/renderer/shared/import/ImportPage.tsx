import { useState, useCallback } from 'react';
import { validateImport, Q_TYPES } from '../../../lib/import/validator';

type ImportResult = { ok: boolean; errors?: string[] } | null;

function parseCsvToPayload(csv: string): unknown {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV needs header + rows');
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    // naive CSV split handling quoted commas
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
    cells.push(cur);
    const obj: Record<string, string> = {};
    header.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? '').trim().replace(/^"|"$/g, '');
    });
    return obj;
  });

  // group rows by testId/sectionId
  const testsMap = new Map<string, any>();
  for (const r of rows) {
    const testId = r.testId || r.test_id || 't_csv';
    if (!testsMap.has(testId)) {
      testsMap.set(testId, {
        id: testId,
        kind: r.kind || r.testKind || 'reading',
        title: r.testTitle || r.title || testId,
        durationSec: Number(r.durationSec) || 3600,
        sections: [],
      });
    }
    const test = testsMap.get(testId);
    const sectionId = r.sectionId || r.section_id || `${testId}_s1`;
    let section = test.sections.find((s: any) => s.id === sectionId);
    if (!section) {
      section = {
        id: sectionId,
        type: r.sectionType || r.type || 'reading',
        title: r.sectionTitle || sectionId,
        questions: [],
      };
      test.sections.push(section);
    }
    const opts = r.options ? tryJson(r.options) ?? r.options.split('|').map((s: string) => s.trim()) : undefined;
    section.questions.push({
      id: r.qId || r.questionId || `${sectionId}_q${section.questions.length + 1}`,
      qType: r.qType || r.qtype || 'MCQ',
      prompt: r.prompt || r.question || '',
      options: opts,
      answer: tryJson(r.answer) ?? r.answer,
      marks: r.marks ? Number(r.marks) : 1,
    });
  }
  return { tests: [...testsMap.values()] };
}

function tryJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function ImportPage(): JSX.Element {
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult>(null);
  const [payloadPreview, setPayloadPreview] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);

  const handlePayload = useCallback(async (raw: string, fileName: string) => {
    setErrors([]);
    setResult(null);
    let payload: any;
    try {
      if (fileName.endsWith('.csv')) {
        payload = parseCsvToPayload(raw);
      } else {
        payload = JSON.parse(raw);
      }
    } catch (e: any) {
      setErrors([`Parse error: ${e.message}`]);
      return;
    }

    const v = validateImport(payload);
    if (!v.ok) {
      setErrors(v.errors);
      setPayloadPreview(JSON.stringify(payload, null, 2).slice(0, 4000));
      return;
    }

    setPayloadPreview(JSON.stringify(payload, null, 2).slice(0, 4000));

    // call IPC if available (electron), else just show validated
    const w = window as any;
    if (w.import?.run) {
      try {
        const r = await w.import.run(payload);
        setResult(r);
        if (!r.ok && r.errors) setErrors(r.errors);
      } catch (e: any) {
        setErrors([e.message ?? String(e)]);
      }
    } else {
      setResult({ ok: true });
    }
  }, []);

  const onFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => handlePayload(String(reader.result ?? ''), file.name);
      reader.readAsText(file);
    },
    [handlePayload],
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Import Content</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload JSON or CSV. Q_TYPES: {Q_TYPES.join(', ')}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={`mt-6 rounded-lg border-2 border-dashed p-8 text-center ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <p className="text-sm">Drag & drop JSON/CSV here or</p>
        <label className="mt-3 inline-block cursor-pointer rounded bg-black px-4 py-2 text-sm text-white">
          Browse file
          <input
            type="file"
            accept=".json,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3">
          <div className="text-sm font-semibold text-red-700">Validation errors ({errors.length})</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {errors.map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok && errors.length === 0 && (
        <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Import succeeded.
        </div>
      )}

      {payloadPreview && (
        <pre className="mt-4 max-h-80 overflow-auto rounded bg-gray-900 p-4 text-xs text-gray-100">{payloadPreview}</pre>
      )}
    </div>
  );
}
