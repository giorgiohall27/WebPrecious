-- Correct multipack products whose case count was previously stored as 1.
update public.products
set units_per_box = (substring(
  upper(unit_measure)
  from '[0-9]+[[:space:]]*PK[[:space:]]*X[[:space:]]*([0-9]+)'
))::integer
where unit_measure is not null
  and upper(unit_measure) ~ '[0-9]+[[:space:]]*PK[[:space:]]*X[[:space:]]*[0-9]+'
  and coalesce(units_per_box, 1) <= 1;

-- Backfill old order lines from the corrected product packaging data.
update public.order_items as item
set units_per_box = greatest(coalesce(product.units_per_box, 1), 1)
from public.products as product
where item.product_id = product.id
  and coalesce(item.units_per_box, 1) <= 1
  and coalesce(product.units_per_box, 1) > 1;
