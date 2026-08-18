import { z } from "zod";

// Postgres-accepted UUID: 8-4-4-4-12 hex, any version/variant. Deliberately
// more permissive than Zod v4's strict RFC `z.uuid()`, which rejects
// non-versioned ids that Postgres stores fine — e.g. the demo seed's
// 10000000-0000-0000-0000-000000000001. Real rows use gen_random_uuid() (a
// valid v4), but validation must accept anything the uuid column will.
export const uuid = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  "معرّف غير صالح.",
);
