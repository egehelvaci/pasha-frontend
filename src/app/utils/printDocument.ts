import createDOMPurify from 'dompurify';

/** Treat API fields as untrusted even when printing into a same-origin popup. */
export function sanitizePrintHtml(target: Window, html: string): string {
  // Browser popup windows expose these constructors, although lib.dom's Window
  // interface does not declare the global constructor properties.
  const purifier = createDOMPurify(target as unknown as Parameters<typeof createDOMPurify>[0]);
  const safeHtml = purifier.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta', 'form'],
  });
  return safeHtml;
}

export function writePrintDocument(target: Window, html: string): void {
  target.document.write(sanitizePrintHtml(target, html));
  // Event attributes are stripped above; install the existing print button safely.
  target.document.querySelector('.print-button')?.addEventListener('click', () => target.print());
}
