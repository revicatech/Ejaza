import Link from "next/link";
import { site } from "@/lib/data/site";
import styles from "./PageBar.module.css";

/** Slim sticky bar for interior (light-background) pages. The main Header is
 *  white-on-transparent and only works over the dark hero. */
export function PageBar({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  return (
    <div className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.mark} />
          {site.name}
        </Link>
        {backHref && backLabel && (
          <Link href={backHref} className={styles.back}>
            ← {backLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
