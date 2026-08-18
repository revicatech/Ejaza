import { Eyebrow } from "@/components/ui/Eyebrow";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <Eyebrow onDark center>فلل وشاليهات دمشق وريفها</Eyebrow>
        </div>
        <h1>
          إجازتك الجاية<br />
          <em>أقرب مما تتخيل</em>
        </h1>
        <p>
          فلل وشاليهات مختارة بعناية في يعفور، بلودان، الزبداني ومضايا — بعيد عن صخب المدينة،
          وقريب منها بنفس الوقت.
        </p>
      </div>
    </section>
  );
}
