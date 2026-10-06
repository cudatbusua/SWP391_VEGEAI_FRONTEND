# Project Architecture Specification

Dự án tuân thủ cấu trúc kiến trúc Feature-Driven / Domain-Driven kết hợp Routing & Server Boundary chuẩn:

```text
src/
├── app/                                  # ROUTING ONLY (thin) — compose from features/
│   ├── [locale]/
│   │   ├── layout.tsx                    #   <html> + <Providers> + metadata + static params
│   │   ├── (auth)/                       #   public: signin · forgot-password · reset-password · account-setup
│   │   ├── (protected)/                  #   guarded group — layout calls requireProfile()
│   │   │   ├── <section>/                #   one folder per route, list + new/ + [id]/ + [id]/edit/
│   │   │   ├── _components/              #   the shell: AppSidebar · AppHeader · CommandPalette · NotificationBell
│   │   │   └── page.tsx                  #   the landing: the sections this caller may open
│   │   └── not-found.tsx
│   ├── api/                              # route handlers (BFF): auth/ · health · geo/search · media/file ·
│   │                                     #   v1/media/upload-parts · operations/events (SSE relay) ·
│   │                                     #   intercom/calls/… (recordings) · reports/archives/…/file ·
│   │                                     #   content-backups/…/snapshot · operations-records/…/export
│   └── global-error.tsx
├── features/                             # THE HEART — logic per domain (≈70 folders)
│   └── <domain>/
│       ├── validation/                   # THE boundary contract — camelCase, shared with mock/. zod only.
│       ├── api/                          # paths.ts · queries.ts (RSC, server-only) · actions.ts (server actions)
│       ├── components/ hooks/ lib/ i18n/ # co-located; i18n = per-feature messages
│       ├── types/                        # domain types, inferred from validation/ — never written twice
│       └── index.ts                      # explicit public API (barrel)
├── providers/                            # app-wide client provider boundary (theme, next-intl, toaster)
├── hooks/                                # cross-feature React hooks (useTableQuery, useFormAction, …)
├── config/                               # static app config: navigation · breadcrumbs · layout · map · tour
├── libs/                                 # env (t3-oss) · api-error · csp · same-origin · rate-limit · instance-guard · map-styles
│   ├── auth/                             #   server-only: session (token pair in cookies) · profile · authz (capabilities)
│   ├── farmtech/                         #   server-only: the backend client — client · authed · read · action · guard ·
│   │                                     #   stream (SSE) · download (files) · upload · edge-refresh · envelope · contract
│   ├── map/                              #   base-layer drawing for the digital map
│   ├── utils/                            #   pure helpers (cn, dates, bytes, …)
│   └── validation/                       #   shared zod helpers for contract modules, imported as #validation/*
├── i18n/                                 # next-intl: routing · navigation (locale-aware Link) · request (merge) · formats
├── locales/<locale>/common.json          # SHARED i18n only (nav, actions, signin)
├── proxy.ts                              # silent token refresh · auth gate on the home path · locale routing · CSP nonce
├── types/                                # barrel over @digitaltwin/types (ActionResult, Paginated)
├── components/                           # app-level shared UI (tables, filters, forms, LookupSelect, PageCrumb) — primitives are @digitaltwin/design-system
└── styles/                               # global.css — Tailwind, then @digitaltwin/design-system's tokens and reset
mock/                                     # the development stand-in for the backend (npm run mock)
scripts/                                  # copy-maplibre-worker.mjs — runs before dev and build
e2e/                                      # Playwright
```

## Ý nghĩa các tầng chính
1. **`src/app/`**: Chỉ đảm nhận routing mỏng (thin routing), render layout, metadata và compose giao diện từ các module `features/`.
2. **`src/features/`**: Trái tim của dự án, tổ chức theo từng domain nghiệp vụ (`recipes`, `auth`, `order`, ...). Mỗi domain có đầy đủ validation schema, API (queries/actions), UI components, hooks và types riêng biệt.
3. **`src/libs/`**: Thư viện dùng chung chạy server-only (auth session, backend client proxy, map, utils, validation helpers).
4. **`src/i18n/` & `src/locales/`**: Quản lý đa ngôn ngữ (next-intl).
5. **`mock/` & `e2e/`**: Mock backend khi dev và test Playwright.
