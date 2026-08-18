import { stats } from "@/lib/data/content";
import styles from "./StatsBand.module.css";

export function StatsBand() {
  return (
    <section className={styles.band}>
      <div className={`container ${styles.grid}`}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.item}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
