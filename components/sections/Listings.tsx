import { getActiveProperties } from "@/lib/api/properties";
import { ListingsClient } from "./ListingsClient";

/** Server component: fetches active listings (cached, tag-invalidated) and
 *  hands them to the interactive client grid. */
export async function Listings() {
  const listings = await getActiveProperties();
  return <ListingsClient listings={listings} />;
}
