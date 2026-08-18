import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/data/site";
import styles from "./CtaBand.module.css";

export function CtaBand() {
  return (
    <section className={styles.band} id="cta">
      <div className={styles.eyebrow}>
        <Eyebrow onDark center>لنبدأ الحديث</Eyebrow>
      </div>
      <h2>
        جاهز تحجز<br />
        <em>فيلتك الجاية؟</em>
      </h2>
      <p>أخبرنا عن المنطقة والتاريخ يلي بدك ياه، ومنساعدك تلاقي الفيلا المناسبة.</p>
      <div className={styles.actions}>
        <Button href={site.whatsappUrl} variant="light">
          تواصل عبر واتساب
        </Button>
        <div className={styles.email}>
          أو راسلنا على <a href={site.emailUrl}>{site.email}</a>
        </div>
      </div>
    </section>
  );
}
