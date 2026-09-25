'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogOptions, CatalogProduct, CatalogProgress, CatalogResult, WorkerMessage } from './model';

type JobState =
  | { status: 'idle' | 'cancelled' }
  | { status: 'running'; progress: CatalogProgress }
  | { status: 'error'; message: string }
  | { status: 'done'; result: CatalogResult; url: string };

export function useCatalogJob() {
  const [state, setState] = useState<JobState>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);
  const url = useRef<string | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout>>();
  const stop = useCallback(() => {
    worker.current?.terminate(); worker.current = null;
    clearTimeout(watchdog.current);
  }, []);
  const reset = useCallback(() => {
    stop();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState({ status: 'idle' });
  }, [stop]);
  useEffect(() => () => { stop(); if (url.current) URL.revokeObjectURL(url.current); }, [stop]);

  const start = useCallback((products: CatalogProduct[], options: CatalogOptions) => {
    if (worker.current || !products.length) return;
    reset();
    const started = performance.now();
    setState({ status: 'running', progress: { phase: 'layout', completed: 0, total: products.length, pages: 0 } });
    const fail = (message: string) => { stop(); setState({ status: 'error', message }); };
    const armWatchdog = () => {
      clearTimeout(watchdog.current);
      watchdog.current = setTimeout(() => fail('İşlem yanıt vermedi. Seçimleriniz korundu; tekrar deneyebilirsiniz.'), 90000);
    };
    try {
      const instance = new Worker(new URL('./catalog.worker.ts', import.meta.url));
      worker.current = instance;
      armWatchdog();
      instance.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (worker.current !== instance) return;
        armWatchdog();
        const message = event.data;
        if (message.type === 'progress') setState({ status: 'running', progress: message.progress });
        else if (message.type === 'error') fail(message.message);
        else {
          stop();
          const blob = new Blob([message.buffer], { type: 'application/pdf' });
          url.current = URL.createObjectURL(blob);
          setState({ status: 'done', url: url.current, result: { blob, pages: message.pages, warnings: message.warnings, elapsedMs: performance.now() - started } });
        }
      };
      instance.onerror = () => fail('PDF işleyicisi başlatılamadı. Lütfen tekrar deneyin.');
      instance.onmessageerror = () => fail('PDF sonucu okunamadı. Lütfen tekrar deneyin.');
      instance.postMessage({ products, options, origin: window.location.origin });
    } catch { fail('PDF işleyicisi başlatılamadı. Güncel bir tarayıcıyla tekrar deneyin.'); }
  }, [reset, stop]);
  const cancel = useCallback(() => { stop(); setState({ status: 'cancelled' }); }, [stop]);
  return { state, start, cancel, reset };
}
