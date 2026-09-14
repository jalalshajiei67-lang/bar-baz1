# Fleet assignment on invoices

Status: approved 2026-09-14

## Problem

Today one person fills an invoice in one sitting: on `/invoices/[id]` a line is
added with fruit, pack count, weight and price all at once, then marked paid.

The real business has three vehicles ("ناوگان") and splits the job in two:

1. An **admin** builds the invoice before the load leaves — customer, fruits,
   how many boxes of each, and which vehicle carries it.
2. The **fleet** carries the boxes, weighs them at the shop, writes the weight
   and the price bargained on the spot, marks paid or unpaid, and saves.

## Decisions

| Question | Decision |
| --- | --- |
| Admin vs fleet | No login. Separate URLs: admin on `/invoices`, fleets on `/fleet/[fleetId]`. Separation, not enforcement. |
| Assignment granularity | One fleet per invoice, chosen at creation. Not reassignable afterwards. |
| Fleet records | A `Fleet` table with a `/fleets` management screen, mirroring `/fruits`. |
| The fleet's save button | One big button: weights + prices + paid/unpaid in a single submit, and the invoice becomes `FINAL`. |

## Data model

`Fleet` — `id`, `name` (unique), `active`, timestamps. Shaped like `Fruit` so
the `/fleets` screen can follow `/fruits`.

`Invoice.fleetId String?` + relation, `onDelete: Restrict`. Nullable so existing
invoices still load; the admin's create form requires it, so new ones always
carry a fleet.

`InvoiceItem.quantity` gains `@default(0)`. The flow needs a line that exists
with packs but no weight yet. The codebase already reads `0` as "not agreed
yet" for `unitPrice` (see `parsePrice` in `src/app/actions/invoices.ts`), so
weight follows the same convention rather than adding a nullable column and
changing every read site.

## Validation split

Falls out of the model above:

- **Admin's save is lenient.** A line with 0 weight and 0 price is a legitimate
  not-yet-delivered line.
- **Fleet's submit is strict.** Every line needs a real weight and a real price,
  because submitting means the load was weighed and handed over.

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/fleets` | admin | Add / rename / deactivate fleets. Clone of `/fruits`. |
| `/invoices` | admin | Unchanged, plus a fleet select in the create form and a fleet column in the table. |
| `/invoices/[id]` | admin | Add-line form drops weight and price: fruit + pack count only. |
| `/fleet` | fleet | One-time picker; the driver bookmarks the next URL. |
| `/fleet/[fleetId]` | fleet | That fleet's invoices for a day, with the day-stepper from `/invoices`. |
| `/fleet/[fleetId]/[invoiceId]` | fleet | The weighing screen. |

New pages type their props with the generated global `PageProps<'/route'>`
helper (`.next/types/routes.d.ts`), which is this Next.js version's documented
convention.

## The weighing screen

Reuses `ItemsEditor` rather than duplicating it — that component already is a
phone-first weigh-and-price form with big inputs, a sticky running total and a
big submit. It gains three optional props: `action`, `submitLabel`, and an
`extra` slot rendered in the sticky footer. Admin behaviour is unchanged when
they are omitted.

The fleet screen passes a `submitDelivery` action and puts a paid/unpaid
segmented control in `extra`, so one button posts everything and flips the
invoice to `FINAL`. The admin can still reopen it to draft from
`/invoices/[id]`, where that control already lives.

Pack counts are read-only here: the admin decided them, the driver reports
weight.

The "last agreed price" hint currently on the admin's add-line form
(`src/app/invoices/[id]/page.tsx`) moves to the fleet's per-line editor, which
is where the pricing decision now happens.

## Accepted consequences

- The admin's add-line form loses its weight and price fields. The admin can
  still fill them by opening the same invoice's editor, so the capability moves
  rather than disappears.
- A misassigned invoice must be deleted and recreated. Adding a fleet dropdown
  to the invoice page is about ten lines if this becomes annoying.

## Verification

`npx tsc --noEmit` and `npm run build`, then `npm run db:push`. Real testing
happens on an Android phone against the deployed Vercel URL — the weighing
screen especially, since it has to work one-thumbed at a shop door.
