import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Collage } from "./Collage";
import styles from "./Intro.module.css";

export function Intro() {
  return (
    <section className={styles.intro} id="intro">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <Eyebrow>تجربتنا</Eyebrow>
          <h2>
            نختار الفلل بعناية، <em>لا بالكم</em>
          </h2>
          <p>
            منصة محلية جديدة لتأجير فلل وشاليهات ريف دمشق. نزور كل فيلا بأنفسنا، نصورها احترافياً،
            ونتأكد من كل تفصيلة فيها قبل ما تنعرض عندنا.
          </p>
          <Button href="#listings">استكشف الفلل</Button>
          <div className={styles.stat}>
            <strong>جديد</strong>
            <span>
              منصة سورية 100%<br />
              مبنية لخدمة أهل الشام
            </span>
          </div>
        </div>
        <Collage />
      </div>
    </section>
  );
}
