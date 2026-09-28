-- Sample data for LOCAL development only. Never run against Neon production.
--
--   docker exec -i barbaz-postgres psql -U postgres -d barbaz < prisma/manual/sample-data.sql
--
-- Adds pastry-shop customers, fruits and ~2 weeks of invoices ending today.
-- Safe to re-run: sample customers are tagged with note '[sample]' and are
-- wiped (with their invoices) before being inserted again. Rows you entered
-- by hand are never touched. Fruits and fleets are matched by name.

BEGIN;

DELETE FROM "Invoice" WHERE "customerId" IN (SELECT id FROM "Customer" WHERE note = '[sample]');
DELETE FROM "Customer" WHERE note = '[sample]';

INSERT INTO "Fruit" (id, name, unit, "updatedAt") VALUES
  ('smp_fruit_' || md5('موز'),       'موز',       'kg', now()),
  ('smp_fruit_' || md5('توت فرنگی'), 'توت فرنگی', 'kg', now()),
  ('smp_fruit_' || md5('رزبری'),     'رزبری',     'kg', now()),
  ('smp_fruit_' || md5('بلوبری'),    'بلوبری',    'kg', now()),
  ('smp_fruit_' || md5('کیوی'),      'کیوی',      'kg', now()),
  ('smp_fruit_' || md5('انبه'),      'انبه',      'kg', now()),
  ('smp_fruit_' || md5('آناناس'),    'آناناس',    'kg', now()),
  ('smp_fruit_' || md5('سیب'),       'سیب',       'kg', now()),
  ('smp_fruit_' || md5('پرتقال'),    'پرتقال',    'kg', now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "Fleet" (id, name, "updatedAt") VALUES
  ('smp_fleet_' || md5('وانت آبی'),   'وانت آبی',   now()),
  ('smp_fleet_' || md5('پیکان بار'),  'پیکان بار',  now()),
  ('smp_fleet_' || md5('نیسان سفید'), 'نیسان سفید', now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "Customer" (id, name, address, lat, lng, phone, note, "updatedAt") VALUES
  ('smp_cust_1', 'شیرینی ناتلی',     'خیابان ولیعصر، بالاتر از پارک ساعی', 35.7590, 51.4090, '021-88776655', '[sample]', now()),
  ('smp_cust_2', 'قنادی رضایی',      'تجریش، میدان قدس',                   35.8040, 51.4330, '021-22714455', '[sample]', now()),
  ('smp_cust_3', 'کافه قنادی گلستان', 'پاسداران، گلستان یکم',              35.7710, 51.4700, '0912-3456789', '[sample]', now()),
  ('smp_cust_4', 'شیرینی سرای پارس',  'تهرانپارس، فلکه اول',                35.7400, 51.5390, '021-77889900', '[sample]', now()),
  ('smp_cust_5', 'قنادی ستاره',      'سعادت آباد، میدان کاج',              35.7760, 51.3690, '0935-1112233', '[sample]', now()),
  ('smp_cust_6', 'شیرینی لادن',      'میدان انقلاب، خیابان کارگر',          35.7010, 51.3910, '021-66123456', '[sample]', now());

DO $$
DECLARE
  -- Rough per-kg price in Toman; each line haggles ±10% around it.
  base jsonb := '{"موز":275000,"توت فرنگی":850000,"رزبری":1900000,"بلوبری":2500000,
                  "کیوی":350000,"انبه":900000,"آناناس":600000,"سیب":120000,"پرتقال":110000}';
  today date := current_date;
  d date;
  c record;
  f record;
  inv_id text;
  is_draft boolean;
  qty numeric;
  price numeric;
  n int := 0;
BEGIN
  PERFORM setseed(0.42);

  FOR d IN SELECT generate_series(today - 13, today, interval '1 day')::date LOOP
    CONTINUE WHEN extract(dow FROM d) = 5;  -- no deliveries on Friday
    is_draft := d = today;

    FOR c IN SELECT id FROM "Customer" WHERE note = '[sample]' ORDER BY id LOOP
      CONTINUE WHEN random() < 0.35;
      n := n + 1;
      inv_id := 'smp_inv_' || n;

      INSERT INTO "Invoice" (id, "customerId", "fleetId", day, status, "updatedAt")
      VALUES (inv_id, c.id,
              (SELECT id FROM "Fleet" WHERE active ORDER BY random() LIMIT 1),
              d, CASE WHEN is_draft THEN 'DRAFT' ELSE 'FINAL' END::"InvoiceStatus", now());

      FOR f IN SELECT id, name FROM "Fruit"
               WHERE active AND base ? name
               ORDER BY random() LIMIT 2 + floor(random() * 3)::int LOOP
        -- Drafts are not weighed or priced yet: 0 kg at 0 Toman, packs counted.
        qty   := CASE WHEN is_draft THEN 0 ELSE round((2 + random() * 28)::numeric, 3) END;
        price := CASE WHEN is_draft THEN 0
                      ELSE round((base->>f.name)::numeric * (0.9 + random() * 0.2) / 1000) * 1000 END;
        INSERT INTO "InvoiceItem" (id, "invoiceId", "fruitId", quantity, "packCount",
                                   "unitPrice", "lineTotal", "updatedAt")
        VALUES (inv_id || '_' || md5(f.id), inv_id, f.id, qty,
                CASE WHEN random() < 0.25 THEN NULL ELSE 1 + floor(random() * 8)::int END,
                price, round(qty * price, 2), now());
      END LOOP;

      UPDATE "Invoice" SET total = (SELECT coalesce(sum("lineTotal"), 0)
                                    FROM "InvoiceItem" WHERE "invoiceId" = inv_id)
      WHERE id = inv_id;
    END LOOP;
  END LOOP;

  -- Payments fill each customer's oldest invoices first: everything older than
  -- a week is settled, and the next invoice in line is paid about halfway.
  UPDATE "Invoice" SET "paidAmount" = total
  WHERE "customerId" LIKE 'smp_cust_%' AND status = 'FINAL' AND day < today - 7;

  UPDATE "Invoice" i SET "paidAmount" = round(i.total * 0.5, -3)
  FROM (SELECT DISTINCT ON ("customerId") id FROM "Invoice"
        WHERE "customerId" LIKE 'smp_cust_%' AND status = 'FINAL' AND day >= today - 7
        ORDER BY "customerId", day, id) first_open
  WHERE i.id = first_open.id AND "customerId" <> 'smp_cust_6';  -- shop 6 owes this whole week

  UPDATE "Invoice" SET paid = ("paidAmount" >= total AND total > 0)
  WHERE "customerId" LIKE 'smp_cust_%';
END $$;

COMMIT;
