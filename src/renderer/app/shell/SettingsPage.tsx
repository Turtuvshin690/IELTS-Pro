import { useEffect, useState, useCallback } from 'react';

export default function SettingsPage(): JSX.Element {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean | null; msg: string } | null>(null);
  const [online, setOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { vault?: { get: () => Promise<string | null> } };
        if (w.vault?.get) {
          const existing = await w.vault.get();
          if (!cancelled && existing) {
            setKey(existing);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    if (!(window as unknown as { vault?: unknown }).vault) {
      setLoaded(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      const w = window as unknown as { vault?: { set: (k: string) => Promise<boolean>; validate: (k: string) => Promise<boolean> } };
      if (!w.vault?.set) {
        setStatus({ ok: false, msg: 'Vault not available in this environment (preload missing). Key would be stored via safeStorage in Electron.' });
        return;
      }
      if (!key.trim()) {
        setStatus({ ok: false, msg: 'API key is empty.' });
        return;
      }
      await w.vault.set(key.trim());
      setStatus({ ok: true, msg: 'Key saved via safeStorage (encrypted).' });
      // auto-validate if online
      if (online && w.vault.validate) {
        setValidating(true);
        try {
          const ok = await w.vault.validate(key.trim());
          setStatus({
            ok,
            msg: ok ? 'Key validated — NVIDIA NIM reachable (models endpoint 200).' : 'Validation failed — check key at build.nvidia.com or check quota/network.',
          });
        } catch (e: unknown) {
          setStatus({ ok: false, msg: `Validate error: ${(e as Error).message ?? String(e)}` });
        } finally {
          setValidating(false);
        }
      } else if (!online) {
        setStatus({ ok: null, msg: 'Offline — key saved locally. Will validate when online.' });
      }
    } catch (e: unknown) {
      setStatus({ ok: false, msg: (e as Error).message ?? String(e) });
    } finally {
      setSaving(false);
    }
  }, [key, online]);

  const handleValidate = useCallback(async () => {
    if (!key.trim()) {
      setStatus({ ok: false, msg: 'Enter a key first.' });
      return;
    }
    setValidating(true);
    setStatus(null);
    try {
      const w = window as unknown as { vault?: { validate: (k: string) => Promise<boolean> } };
      if (!w.vault?.validate) {
        setStatus({ ok: false, msg: 'Validate not available (preload missing).' });
        return;
      }
      if (!online) {
        setStatus({ ok: null, msg: 'Offline — validation requires internet (integrate.api.nvidia.com/v1/models).' });
        return;
      }
      const ok = await w.vault.validate(key.trim());
      setStatus({
        ok,
        msg: ok ? 'Key validated — NVIDIA NIM reachable.' : 'Invalid key or quota exceeded — check build.nvidia.com API key.',
      });
    } catch (e: unknown) {
      setStatus({ ok: false, msg: `Validate error: ${(e as Error).message ?? String(e)}` });
    } finally {
      setValidating(false);
    }
  }, [key, online]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">BYOK — Bring Your Own Key. Stored encrypted via Electron safeStorage. Never sent except to NVIDIA NIM.</p>

      {!online && (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="offline-banner">
          Offline — you are offline. Settings are saved locally; API validation requires internet.
        </div>
      )}

      {online && (
        <div className="mt-4 rounded border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-800" data-testid="online-banner">
          Online — validation will call <code>integrate.api.nvidia.com/v1/models</code> with Bearer key.
        </div>
      )}

      <div className="mt-6 rounded-lg border bg-white p-5 shadow-sm">
        <label htmlFor="byok-input" className="block text-sm font-medium">
          NVIDIA API Key (BYOK)
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Get a key at{' '}
          <a href="https://build.nvidia.com" target="_blank" rel="noreferrer" className="underline">
            build.nvidia.com
          </a>{' '}
          — used for Nemotron (Writing/Speaking scoring), Parakeet ASR, Magpie TTS. Key is stored via <code>safeStorage</code> in{' '}
          <code>%APPDATA%/IELTS Pro/vault.bin</code>.
        </p>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <input
              id="byok-input"
              data-testid="byok-input"
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full rounded border px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-1 top-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
              data-testid="toggle-show"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || validating || !loaded}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="save-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleValidate}
            disabled={validating || saving}
            className="rounded border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            data-testid="validate-btn"
          >
            {validating ? 'Validating…' : 'Validate'}
          </button>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {loaded ? (
            key ? (
              <span>Key length: {key.length} • {show ? 'visible' : 'hidden (password field)'}</span>
            ) : (
              <span>No key saved yet.</span>
            )
          ) : (
            <span>Loading vault…</span>
          )}
        </div>

        {status && (
          <div
            className={`mt-4 rounded border px-3 py-2 text-sm ${
              status.ok === true
                ? 'border-green-200 bg-green-50 text-green-800'
                : status.ok === false
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
            data-testid="status-banner"
          >
            {status.msg}
          </div>
        )}

        <div className="mt-5 rounded border bg-gray-50 p-3 text-xs leading-relaxed text-gray-600" data-testid="quota-banner">
          <div className="font-semibold text-gray-800">Quota & local-only note</div>
          <p className="mt-1">
            This app is <span className="font-medium">local-only</span>. No backend, no user accounts. All attempts, scores, and imported tests stay in{' '}
            <code className="rounded bg-white px-1">%APPDATA%/IELTS Pro/ielts.db</code> (WAL). The key you set is only used to proxy NIM calls from the main process;
            it never leaves your machine except as an `Authorization: Bearer` header to `integrate.api.nvidia.com`.
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            If validation returns 401/429: your key may be invalid, expired, or rate-limited. Check usage at{' '}
            <a href="https://build.nvidia.com" className="underline">
              build.nvidia.com
            </a>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 rounded border bg-white p-4">
        <h2 className="text-sm font-semibold">Troubleshooting</h2>
        <ul className="mt-2 list-disc pl-5 text-xs leading-relaxed text-gray-600">
          <li>
            Offline caching: If you submit Writing/Speaking while offline, attempts are queued in <code>localStorage: offlineQueue</code> and retried when back online.
          </li>
          <li>
            Encryption: <code>safeStorage.isEncryptionAvailable()</code> must be true — otherwise the key is stored plaintext fallback (dev only).
          </li>
          <li>
            Test the key: click <span className="font-medium">Validate</span> — we call <code>GET /v1/models</code> and check <code>r.ok</code>.
          </li>
        </ul>
      </div>
    </div>
  );
}
