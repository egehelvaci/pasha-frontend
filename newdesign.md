# B2B SYSTEM — UI/UX REDESIGN SPECIFICATION

## 0. PRIMARY OBJECTIVE

This project is a **UI/UX redesign only**.

The goal is to make the existing B2B system look and feel as if it has been designed by a professional product design team with strong experience in enterprise/B2B applications.

The redesign must deliver:

* A consistent visual language across the entire application
* A modern, premium and professional interface
* Clear information hierarchy
* Better usability for non-technical users such as dealers, shop employees and business users
* Reduced perceived complexity without reducing information density
* Consistent interaction patterns
* Consistent spacing, typography, colors and component behavior
* Strong visual relationship between all redesigned pages
* A polished production-ready appearance

### ABSOLUTE PRIORITY

> **FUNCTIONAL BEHAVIOR MUST NOT CHANGE.**

This is not a feature development, architecture refactor, business logic refactor or application rewrite.

The existing application must continue to behave exactly as it did before the redesign.

The expected result is:

> **Same functionality + same data + same behavior + significantly improved UI/UX.**

---

# 1. ZERO FUNCTIONAL DIFF POLICY

This is the most important rule of the project.

Do not make functional changes unless a change is strictly required to visually implement the redesign.

The following must remain unchanged:

* API endpoints
* API request structures
* API response structures
* Backend code
* Database structure
* Authentication
* Authorization
* User permissions
* Routing
* Route parameters
* State management logic
* Business logic
* Calculations
* Data transformations
* CRUD behavior
* Form submission behavior
* Validation rules
* Search behavior
* Filtering behavior
* Sorting behavior
* Pagination behavior
* Modal behavior
* Dropdown behavior
* Tab behavior
* File upload/download behavior
* Notification behavior
* Existing user flows
* Existing data
* Existing actions
* Existing permissions
* Existing integrations

### DO NOT

* Add new features
* Remove existing features
* Change business rules
* Change API calls
* Change API contracts
* Change state logic
* Rewrite working components without necessity
* Change routing
* Change data structures
* Change validation
* Change calculations
* Change CRUD operations
* Change search/filter logic
* Change pagination logic
* Change authorization logic
* Replace working functionality with a different implementation just because it looks cleaner

### IMPORTANT

Before modifying an existing component, understand:

1. What it currently does
2. Which data it receives
3. Which events it triggers
4. Which state it controls
5. Which APIs it interacts with
6. Which other components depend on it

If the existing component works correctly, preserve its behavior.

---

# 2. WHAT IS ALLOWED

Changes are allowed only within the presentation and UX layer.

Allowed changes include:

* Layout
* Grid/flex structure
* Spacing
* Padding
* Margin
* Typography
* Font size
* Font weight
* Line height
* Colors
* Backgrounds
* Borders
* Border radius
* Shadows
* Cards
* Tables
* Forms
* Inputs
* Selects
* Buttons
* Tabs
* Visual modal design
* Visual dropdown design
* Visual pagination design
* Hover states
* Focus states
* Active states
* Disabled states
* Empty states
* Loading state presentation
* Error state presentation
* Responsive layout
* Component positioning
* Visual hierarchy
* Information grouping
* Visual density
* Micro-interactions

The goal is to improve **how the existing functionality is presented**, not what the functionality does.

---

# 3. DESIGN QUALITY STANDARD

The final UI should look like the result of a professional product design process.

Do not produce a generic "AI-generated modern dashboard".

Avoid superficial modernization such as:

* Excessive gradients
* Excessive glassmorphism
* Excessive shadows
* Excessive rounded cards
* Excessive icons
* Oversized typography
* Excessive whitespace
* Decorative elements without purpose
* Random badges
* Random illustrations
* Excessive animations
* Visually noisy dashboards
* "Dribbble-style" interfaces that sacrifice usability

The design should feel:

* Professional
* Calm
* Mature
* Premium
* Functional
* Consistent
* Efficient
* Trustworthy
* Enterprise-ready

The system is a daily-use B2B application.

It is not a marketing website or design showcase.

---

# 4. DESIGN THINKING

Do not redesign each page independently.

Think of the application as **one product**.

Every page must feel like another screen of the same application.

Before modifying individual pages:

1. Analyze the existing application
2. Identify repeated UI patterns
3. Identify inconsistent patterns
4. Establish a coherent visual language
5. Apply that language consistently across all pages

Do not create a unique visual style for each page.

---

# 5. EXISTING APPLICATION ANALYSIS

Before writing significant UI code, inspect the project.

Analyze:

* Application layout
* Header
* Sidebar/navigation
* Dashboard
* Existing component structure
* Global CSS
* Tailwind configuration
* Theme configuration
* Existing design tokens
* Typography
* Color palette
* Buttons
* Inputs
* Selects
* Tables
* Cards
* Modals
* Forms
* Pagination
* Tabs
* Dropdowns
* Toasts
* Notifications
* Empty states
* Loading states
* Responsive behavior

Identify reusable patterns.

Identify components that already provide the required functionality.

Prefer improving existing components over creating unnecessary replacements.

---

# 6. DESIGN SYSTEM

Create a coherent visual system before redesigning all pages.

The design system should define consistent rules for:

## Typography

Establish a clear hierarchy for:

* Page title
* Section title
* Subsection title
* Body text
* Secondary text
* Labels
* Helper text
* Table text
* Button text

Do not randomly change heading sizes from page to page.

Typography should communicate hierarchy without being oversized.

---

# 7. PAGE TITLE REFERENCE

The homepage's **"Çok Satanlar"** section should be used as a visual reference for the application's section/page heading language.

Analyze:

* Font size
* Font weight
* Typography
* Spacing
* Alignment
* Relationship with surrounding content

Use this as the foundation for the global heading hierarchy.

Do not create unrelated heading styles for different pages.

The application should have a clear and predictable heading system.

---

# 8. COLOR SYSTEM

Use a restrained color palette.

Define consistent roles for:

* Primary
* Secondary
* Background
* Surface
* Border
* Primary text
* Secondary text
* Muted text
* Success
* Warning
* Error
* Info

Neutral colors should dominate the interface.

Semantic colors should communicate meaning.

Do not use color merely for decoration.

Do not create colorful cards or sections without a clear UX reason.

---

# 9. SPACING SYSTEM

Establish consistent spacing rules.

Pay particular attention to:

* Page padding
* Header spacing
* Section spacing
* Card padding
* Form spacing
* Input spacing
* Table cell padding
* Button spacing
* Filter spacing
* Modal spacing

Avoid arbitrary spacing values when an existing project convention can be reused.

The application should feel rhythmically consistent.

---

# 10. COMPONENT CONSISTENCY

Common UI components should visually belong to the same design system.

Examples:

* PageHeader
* SectionHeader
* Button
* Input
* Select
* Table
* Modal
* Badge
* Card
* Pagination
* Tabs
* Dropdown
* Filter
* EmptyState
* LoadingState

If an existing component already provides the required functionality, prefer styling/improving that component rather than replacing it.

Do not merge unrelated components merely to reduce component count.

---

# 11. PAGE STRUCTURE

Where appropriate, pages should follow a predictable hierarchy.

## Page Header

Typical structure:

* Page title
* Optional description
* Primary action

The most important action should have clear visual priority.

## Section

Typical structure:

* Section heading
* Optional description
* Content

## Data-heavy pages

Use a consistent pattern where appropriate:

* Page header
* Search/filter area
* Table
* Actions
* Pagination

## Analytics / Dashboard pages

Use a consistent information hierarchy:

* Summary information
* Metrics
* Charts
* Detailed data

This is a visual pattern only.

Do not change how the underlying data is calculated or retrieved.

---

# 12. TABLE DESIGN

Tables are one of the most important UI elements in this B2B system.

Tables must be:

* Easy to scan
* Dense enough for business use
* Highly readable
* Visually structured
* Free from unnecessary decoration

Clearly distinguish:

* Header
* Rows
* Hover state
* Selected state if already supported
* Actions

Do not unnecessarily enlarge row heights.

Do not hide existing columns.

Do not remove existing actions.

Do not change table behavior.

Action areas should be visually clear without becoming icon-heavy.

---

# 13. FORM DESIGN

Forms should be easy to understand for users with limited technical knowledge.

Use a clear hierarchy:

Label
→ Input
→ Helper text
→ Validation message

Labels must remain visible.

Do not use placeholders as replacements for labels.

Do not unnecessarily compress forms into many columns.

Use logical grouping and consistent spacing.

Do not change:

* Form fields
* Validation
* Submission behavior
* Required/optional logic
* Existing actions

Only improve their presentation.

---

# 14. BUTTON SYSTEM

Establish clear button hierarchy.

Use visual distinction between:

* Primary action
* Secondary action
* Destructive action
* Tertiary/minor actions

The primary action should have the strongest visual priority.

Do not make every button visually dominant.

Do not arbitrarily change button text.

Existing button labels must remain unchanged unless a purely visual implementation requires no textual change.

Avoid placing icons inside every button.

---

# 15. ICON POLICY

Icons should be used sparingly.

Do not use icons as decoration.

Use an icon only when it:

* Improves recognition
* Represents an action
* Supports an existing interaction pattern
* Clearly improves usability

Do not add icons to every heading.

Do not add icons to every button.

Do not add icons to every navigation item.

Text should remain the primary communication method where appropriate.

---

# 16. CARD POLICY

Cards should be used selectively.

Good candidates:

* Dashboard metrics
* Statistics
* Financial summaries
* Analytical information
* Important grouped information

Avoid putting every section inside a card.

Avoid:

* Heavy shadows
* Excessive radius
* Decorative card backgrounds
* Multiple nested cards

Cards should feel lightweight and functional.

---

# 17. NAVIGATION

Navigation must remain functionally identical.

Only visual presentation may change.

The user must always understand:

* Where they are
* Which section is active
* Which navigation item can be selected

Active and hover states should be visually consistent throughout the application.

Do not change:

* Routes
* Navigation structure
* Permissions
* Menu behavior

---

# 18. RESPONSIVE DESIGN

Preserve existing functionality across:

* Desktop
* Tablet
* Mobile

Improve responsive presentation where necessary.

Pay special attention to:

* Header
* Sidebar
* Tables
* Forms
* Filters
* Modals
* Buttons
* Page headers

Responsive improvements must not introduce new functional behavior.

---

# 19. MICRO-INTERACTIONS

Animations should be subtle and purposeful.

Allowed:

* Hover transitions
* Button interaction
* Dropdown transition
* Modal transition
* Tab transition
* Focus transition

Avoid:

* Long animations
* Decorative page animations
* Excessive motion
* Attention-grabbing effects
* Animations that slow down task completion

The application should feel fast.

---

# 20. INFORMATION DENSITY

Do not confuse "clean design" with "empty design".

This is a B2B system.

Users need to see meaningful amounts of information quickly.

Therefore:

* Reduce visual noise
* Do not unnecessarily reduce information
* Do not create excessive whitespace
* Keep important data accessible
* Keep tables practical
* Keep actions close to the relevant content

The goal is:

> **Lower cognitive load without reducing useful information.**

---

# 21. REDESIGN SCOPE

The following pages must be redesigned using the same design system:

1. Kullanıcı Yönetimi
2. Bayi Talepleri
3. Çalışan İstatistikleri
4. Muhasebe Yönetimi
5. Ürün Kuralları Yönetimi
6. Fiyat Listeleri
7. Mağazalar
8. Ödemeler
9. Analiz Paneli
10. Koleksiyonlar

If "Mağazalar" appears more than once due to existing routing/component structure, inspect the current implementation.

Do not change routing or functionality.

Only ensure that the relevant UI follows the same design system.

---

# 22. EXISTING CONTENT MUST REMAIN

Preserve existing:

* Text
* Button labels
* Table columns
* Form fields
* Menu items
* Filters
* Actions
* Data
* User flows
* Existing information

Do not remove content simply because it appears visually unnecessary.

If content creates visual complexity, improve its hierarchy or positioning instead.

---

# 23. PROFESSIONAL DESIGN REVIEW

After implementing the redesign, review the entire application as a professional product design team would.

Check:

### Visual consistency

* Do all pages look like the same product?
* Are typography rules consistent?
* Are spacing rules consistent?
* Are buttons consistent?
* Are inputs consistent?
* Are tables consistent?
* Are cards consistent?
* Are borders and radii consistent?
* Are colors consistent?

### UX consistency

* Can the user immediately identify the current page?
* Is the page purpose obvious?
* Is the primary action obvious?
* Is important information visually prioritized?
* Are forms easy to understand?
* Are tables easy to scan?
* Are actions easy to find?

### Visual quality

* Does the interface look professionally designed?
* Does it avoid generic AI-generated UI patterns?
* Is the visual hierarchy deliberate?
* Is the interface visually calm?
* Is there unnecessary decoration?
* Is there excessive whitespace?
* Is the interface too dense?
* Are components visually balanced?

---

# 24. CROSS-PAGE REVIEW

After all pages are redesigned, compare them side by side.

Look specifically for cases where the same component looks different.

Examples:

* Different page title sizes
* Different section spacing
* Different button heights
* Different input heights
* Different border radii
* Different table headers
* Different modal styles
* Different card styles
* Different filter layouts
* Different pagination styles
* Different active states

Correct these inconsistencies.

The result must feel like:

> **One product, one design system, multiple screens.**

---

# 25. IMPLEMENTATION STRATEGY

Follow this sequence.

## Phase 1 — Analyze

Inspect the existing application before making broad changes.

Identify:

* Existing reusable components
* Existing UI patterns
* Existing styling conventions
* Existing design tokens
* Existing inconsistencies

## Phase 2 — Establish visual system

Define the common visual language:

* Typography
* Colors
* Spacing
* Borders
* Radius
* Buttons
* Inputs
* Tables
* Cards
* Modals
* Tabs
* Pagination

## Phase 3 — Reference screen

Use the homepage and especially the **"Çok Satanlar"** section as a visual reference.

Do not redesign the homepage unnecessarily.

Use its existing visual language to establish consistency.

## Phase 4 — Redesign pages

Apply the design system to:

* Kullanıcı Yönetimi
* Bayi Talepleri
* Çalışan İstatistikleri
* Muhasebe Yönetimi
* Ürün Kuralları Yönetimi
* Fiyat Listeleri
* Mağazalar
* Ödemeler
* Analiz Paneli
* Koleksiyonlar

## Phase 5 — Cross-page consistency

Review every redesigned page together.

Fix visual inconsistencies.

## Phase 6 — Functional verification

Verify that the redesign has not changed existing behavior.

---

# 26. MINIMUM-CODE-CHANGE PRINCIPLE

Do not refactor the application unnecessarily.

Avoid:

* Business logic refactoring
* API refactoring
* State management refactoring
* Architecture changes
* File structure changes
* Data model changes
* Unrelated code cleanup

Only change the code necessary to implement the UI redesign.

If a visual improvement can be achieved without changing functionality, choose that approach.

---

# 27. FUNCTIONAL REGRESSION CHECK

Before considering the redesign complete, verify:

* API behavior remains unchanged
* Routing remains unchanged
* Authentication remains unchanged
* Authorization remains unchanged
* State behavior remains unchanged
* Form submission remains unchanged
* Validation remains unchanged
* CRUD behavior remains unchanged
* Search remains unchanged
* Filtering remains unchanged
* Sorting remains unchanged
* Pagination remains unchanged
* Modal behavior remains unchanged
* Dropdown behavior remains unchanged
* Tab behavior remains unchanged
* Existing actions remain available
* Existing data remains visible
* Existing user permissions remain intact

If a UI change appears to require a functional change, stop and preserve the existing behavior.

---

# 28. FINAL ACCEPTANCE CRITERIA

The redesign is successful only if all of the following are true:

### Design

The application looks professionally designed, polished and production-ready.

### Consistency

All redesigned pages clearly belong to the same design system.

### Usability

Users can understand where they are, what they can do and which information matters without having to learn the interface.

### B2B suitability

The interface remains efficient for daily business use.

### Information density

Useful information is preserved and remains accessible.

### Visual hierarchy

Important information and actions have clear visual priority.

### Restraint

The interface does not rely on excessive gradients, shadows, animations, icons, colors or rounded cards to appear modern.

### Functional safety

Existing functionality remains unchanged.

### Final principle

> **Do not redesign the product's behavior. Redesign the way the existing product is presented.**

The final result should feel like an established B2B product that has undergone a professional product-design and UI modernization process — not like a collection of individually redesigned pages.
