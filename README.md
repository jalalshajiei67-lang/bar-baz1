# Bar-Baz — daily fruit invoices

Small app for a fruit distribution business selling to pastry shops.

The work is split between two people. An **admin** builds each invoice before
the load leaves — customer, fruits, how many boxes of each, and which of the
vehicles carries it. The **fleet** driver then weighs the boxes at the shop,
writes the weight and the price bargained on the spot, marks paid or unpaid,
and commits the lot with one button.

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

Admin screens:

| Route            | What it does                                                          |
| ---------------- | --------------------------------------------------------------------- |
| `/customers`     | List, search, add, edit and delete customers                          |
| `/customers/new` | New customer, with a Tehran map (click or drag the pin to set a spot) |
| `/fruits`        | Add, rename, deactivate and delete fruits                             |
| `/fleets`        | Add, rename, deactivate and delete the vehicles                       |
| `/invoices`      | Invoices for a day, plus the day's grand total                        |
| `/invoices/[id]` | Build the load: fruits and box counts. Finalize, print, delete        |

Fleet screens, opened on the driver's phone:

| Route                          | What it does                                     |
| ------------------------------ | ------------------------------------------------ |
| `/fleet/[fleetId]`             | Everything outstanding, then finished rounds     |
| `/fleet/[fleetId]/[invoiceId]` | Weigh, price, paid/unpaid, one button to commit  |

Note `/fleets` (admin) and `/fleet/…` (driver) differ by one letter.

`/fleet/[fleetId]` opens with **everything still to weigh, whatever its date**,
oldest first, each load labelled with its day when it is not today — a load
dated tomorrow must not look like no load at all. Below that, a day stepper
looks back at rounds already finished. The two sections never show the same
invoice: one is what is left to do, the other is what is done.

The daily loop: admin opens `/invoices`, picks the customer and the vehicle →
adds each fruit and how many boxes of it → the driver opens their own page,
taps a shop, fills in weight and price, answers paid or unpaid, and submits.

There is no login. Each fleet's page is reached only by the link the admin
copies from `/fleets` and sends once; no page lists the fleets to a driver, and
the fleet screens link nowhere else in the app, so the nav bar is hidden there.
The URLs separate the jobs — a hand-typed `/invoices` would still open, so this
keeps drivers in their own lane rather than guarding against a determined one.

Persian and Arabic digits are accepted everywhere a number is typed, so `۳٫۱۲۳`
and `3.123` both work.

## Data model

- **Customer** — name, optional address, `lat`/`lng` picked on the map.
- **Fruit** — name (unique), unit (kg).
- **Fleet** — name (unique), `active`. One of the vehicles.
- **Invoice** — one customer, one day, one fleet, a status and a snapshotted
  total. `fleetId` is nullable only for invoices that predate fleets; the
  admin's form requires one.
- **InvoiceItem** — fruit, `packCount` (boxes, null = فله), `quantity` (kg,
  3 decimals, e.g. `3.123`), `unitPrice` bargained with this customer, and
  `lineTotal`. Storing the price on the line means editing a price later never
  rewrites an old invoice.

`quantity` and `unitPrice` both default to `0`, which reads as "not filled in
yet": the admin creates a line with boxes alone, and the fleet supplies the
rest. The admin's save tolerates those zeros; the fleet's submit refuses them,
because handing the load over means it was weighed.

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
