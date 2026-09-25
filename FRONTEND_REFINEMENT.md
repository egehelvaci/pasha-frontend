# Dashboard visual refinement

## Scope and design
The primary target is `/dashboard`, the wholesale dealer portal. Public homepage visual improvements remain, but consumer marketing headings and promotional copy have been removed per feedback. The dashboard uses restrained navy/ivory surfaces, compact sans-serif headings, a direct product-list action and responsive product cards.

## Architecture
- `BannerCarousel`: shared responsive frames, mobile picture sources, `object-fit: contain`, pagination outside artwork and accessible keyboard navigation. No automatic slide changes. Entire images remain visible without distortion; mismatched aspect ratios intentionally leave space around the image.
- `getBestsellers`: existing one-year analytics endpoints, admin-wide or dealer-specific. Validates success, payload shape and sales quantities; filters zero sales and duplicates, then sorts by quantity. No invented sales data.
- `BestSellers`: skeleton, success, empty and retryable error states; aborts on unmount and times out at 15 seconds. Cards open the existing full product-detail route.
- `ProductVisual`: contained, lazy-loaded images with a local logo fallback. `ProductSkeleton`: matching responsive placeholder cards.
- Motion respects reduced-motion preferences. Dashboard focus rings remain visible despite legacy global resets.
- No environment variables or permissions changed.

## Checks
- `npm run test:bestsellers`: five regression tests covering endpoint selection, real sales ordering, numeric strings, empty results, failed/malformed results and duplicates.
- `npm run lint`: uses existing flat ESLint configuration; 54 pre-existing warnings, no errors. Changed dashboard components lint cleanly.
- `npm run build`: production compilation, type checking and 44 generated pages.
- `npm run start`: production smoke test.
- Signed in locally with the user-provided admin account. Real sales products and three banners loaded successfully. No orders or backend data were modified.

## Manual regression checklist
At 390px, 768px and 1440px: verify heading wrapping, two/four-column product grid, banner containment, mobile art direction, pagination and absence of horizontal page overflow. Check keyboard focus and reduced motion. Confirm admin ordering against one-year analytics and dealer ordering against personal statistics. Throttle requests for skeletons; fail/empty the statistics response and retry. Navigate away during fetching to check cancellation. Product links must open their existing detail pages.

## Login refinement
- Split desktop layout pairs the existing backend-selected image with a navy overlay and a light form. Mobile keeps a focused single-column form.
- Added properly associated labels, autocomplete, password visibility, accessible errors, disabled submitting states and a dealer-application link. Existing authentication and remember-me behavior are preserved.
- Optional background image loading uses the service layer, abort/timeout handling and a bundled fallback. Background failures never block login.
- Browser checks completed for dashboard at 390/768/1440px and login at 390/1440px, with no horizontal overflow. Verified password visibility toggle and form submitting state with the supplied test account.
- The redesigned login successfully redirected to `/dashboard` using the supplied account. Banner pagination switched to the portrait artwork; the best-seller product link opened its existing detail page successfully. No cart, order or catalog changes were made during verification.
