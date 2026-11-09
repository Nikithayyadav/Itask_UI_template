# iTASK frontend
 
Responsive iTASK workspace prototype built with React, TypeScript, and Vite. The screens follow the supplied BIZTAB UX deck, role JSON, and feature matrix. The app is frontend-only and uses isolated in-memory mock data; no real API routes are assumed.

## Run locally

Requirements: Node.js 20.11+ or 22+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and preview a production build:

```bash
npm run build
npm run preview
```

Quality checks:

```bash
npm run lint
npm run build
```

## Included

- Owner, Contributor, and Reviewer role switcher populated from `src/config/applications/itask/iTaskConfig.json`.
- Separate Owner portfolio, Reviewer queue, and Contributor delivery dashboards.
- The main dashboard has no sidebar. On module screens, a three-line button in the top bar opens a drawer with expandable feature folders and transaction subfolders built from the JSON hierarchy. The drawer list scrolls independently from the page.
- The always-on comment rail is removed. Review and feedback workflows remain available through their role modules.
- Responsive dashboard, project tracker, task tracker, activity, submission, evidence, feedback, notification, review, team, and report screens.
- Search, status filters, pagination, progress/status changes, comments, and create/submit/review forms.
- Persistent role selection and collapsible sidebar state in local storage.
- Roles, modules, transactions, dashboard KPIs, table/form/filter/status definitions, navigation, and mock data are centralized in `src/config/applications/itask/iTaskConfig.json`. Mock transaction records are indexed by role, module, and transaction; initial project/task/activity state comes from that same configuration.
- Original brief, PPT, and screenshots in `public/reference/` for design traceability.

## Backend connection

The Project Tracker listing currently uses an isolated mock adapter in `src/services/resources/projects.ts` that builds and consumes the documented `GET_PROJECT_TRACKER` BDOC request/response shape. No HTTP request is sent: the endpoint, transport method, authentication, and request metadata sources have not been confirmed. The mock uses existing role-scoped project fixtures and clearly marked placeholder metadata, configurable through the project service. Replace/configure the adapter only after the remaining backend details are confirmed. The existing generic API adapter in `src/services/api.ts` remains in-memory for other resources. Set `VITE_API_BASE_URL` only when the backend base URL is known.

## Project structure

```text
src/
  app/                 App orchestration, shared types, and helpers
  components/
    layout/            Shared top navigation and role-aware sidebar
    ui/                Shared form controls
    modals/            Shared modal shell; feature form fields stay in feature folders
  config/
    applications/itask/iTaskConfig.json
                       Centralized application, UI, navigation, and mock-data configuration
  data/
    initialData.ts     Initial app state from the central configuration
  transactions/
    transactionData/   JSON registry and transaction data lookup
    transactionRouter.ts
    ...                Form-to-model transaction handlers
  features/
    activity/           Activity screen, form fields, and types
    dashboard/          Role dashboards
    documents/          Documents and evidence screen
    feedback/           Feedback screen
    notifications/      Notifications screen
    profile/            Profile form fields
    projects/           Project screens, form fields, and types
    reports/            Report screens
    reviews/            Review screen, form fields, workflow, and types
    submissions/        Submission screen, form fields, and types
    tasks/              Task screens, form fields, and types
    team/               Team tracker screen
    workspace/          Shared feature page shell and screen dispatcher
  transactions/         Transaction data, form-to-model handlers, and screen routing
    activity/           Daily activity transaction
    profile/            Profile update transaction
    projects/           Project create transaction
    reviews/            Review decision transaction
    submissions/        Submission transaction
    tasks/              Task create transaction
  services/
    resources/          Per-resource API adapters (projects, tasks, etc.)
                       api.ts is the replaceable backend transport boundary
  styles/               Responsive workspace styling
public/reference/       Supplied UX deck, screenshots, and feature matrix
```

`main.tsx` is the browser entry point. `App.tsx` coordinates role state, navigation, and URL routes. Module dashboards use `/modules/<role>/<module>`; transaction screens use `/transactions/<role>/<module>/<transaction>`. Browser back and forward restore those routes. `ConfigLoader.ts` validates and exposes the centralized JSON, and `transactions/transactionData/registry.ts` resolves transaction metadata and mock data by the composite role/module/transaction key. Generic table and field renderers consume the JSON definitions, while feature components and TypeScript transaction handlers retain business-specific behavior. `services/resources/` isolates backend operations by resource. Replace the mock adapter in `services/api.ts` with agreed backend calls when the API contract is ready.
