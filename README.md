# Bar-Baz — daily fruit invoices

Small app for a fruit distribution business selling to pastry shops.
Manage customers, keep a daily price list per fruit, and build a daily
invoice per customer.

## Stack

| Piece      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js (App Router) + TypeScript                  |
| Styling    | Tailwind CSS v4                                    |
| Database   | Neon serverless Postgres                           |
| ORM        | Prisma 7 with the Neon driver adapter              |
| Validation | Zod                                                |
| Map        | Leaflet + react-leaflet (OpenStreetMap, Tehran)    |
| Hosting    | Vercel (free tier)                                 |

## Screens

| Route            | What it does                                                          |
| ---------------- | --------------------------------------------------------------------- |
| `/customers`     | List, search, add, edit and delete customers                          |
| `/customers/new` | New customer, with a Tehran map (click or drag the pin to set a spot) |
| `/fruits`        | Add, rename, deactivate and delete fruits                             |
| `/prices`        | One day's price list; step through days, prefill from the last price  |
| `/invoices`      | Invoices for a day, plus the day's grand total                        |
| `/invoices/[id]` | Add lines (kg with 3 decimals), edit, finalize, print                 |

The daily loop: enter prices on `/prices` → open the customer's invoice on
`/invoices` → add each fruit with its weight → read the total off the invoice.

Persian and Arabic digits are accepted everywhere a number is typed, so `۳٫۱۲۳`
and `3.123` both work.

## Data model

- **Customer** — name, optional address, `lat`/`lng` picked on the map.
- **Fruit** — name (unique), unit (kg).
- **DailyPrice** — one price per fruit per day, unique on `(fruitId, day)`.
  Nothing is overwritten across days, so the price history is the archive.
- **Invoice** — one customer, one day, a status and a snapshotted total.
- **InvoiceItem** — fruit, `quantity` (kg, 3 decimals, e.g. `3.123`),
  `unitPrice` copied from that day's price, and `lineTotal`. Copying the price
  onto the line means editing a price later never rewrites an old invoice.

Money uses `Decimal`, never `Float`.

## Getting started

1. Create a free Postgres database at [neon.tech](https://neon.tech).
2. Copy the connection strings:

   ```bash
   cp .env.example .env.local
   # then edit DATABASE_URL (pooled) and DIRECT_URL (direct)
   ```

3. Install and push the schema:

   ```bash
   npm install          # also runs `prisma generate`
   npm run db:push      # or: npm run db:migrate  (creates a migration file)
   npm run dev
   ```

Open http://localhost:3000.

## Scripts

| Script               | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Dev server                                  |
| `npm run build`      | Production build                            |
| `npm run db:push`    | Push the schema straight to the database    |
| `npm run db:migrate` | Create and apply a migration                |
| `npm run db:studio`  | Browse the data in Prisma Studio            |

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add `DATABASE_URL` and `DIRECT_URL` as environment variables (or use the
   Vercel–Neon integration, which sets them for you).
3. `postinstall` runs `prisma generate` on every build, so no extra build
   command is needed.
4. Run `npm run db:push` once against the production database (locally, with
   the production `DIRECT_URL`) to create the tables.

Everything fits the free tier: no background workers, no persistent server,
no file storage.
