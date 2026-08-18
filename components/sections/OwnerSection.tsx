import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";
import { ownerBenefits } from "@/lib/data/content";
import styles from "./OwnerSection.module.css";

export function OwnerSection() {
  return (
    <section className={styles.section} id="owners">
      <div className={`container ${styles.grid}`}>
        <div className={styles.content}>
          <Eyebrow onDark>لأصحاب الفلل</Eyebrow>
          <h2>عندك فيلا فاضية أغلب الوقت؟ خليها تشتغل</h2>
          <p>
            منصوّرها مجاناً، منعرضها بشكل احترافي، ومنجيبلك حجوزات حقيقية. ما بتدفع اشتراك ولا رسوم
            مقدّمة.
          </p>
          <ul className={styles.list}>
            {ownerBenefits.map((benefit) => (
              <li key={benefit}>
                <CheckIcon />
                {benefit}
              </li>
            ))}
          </ul>
          <Button href="#cta">سجّل فيلتك</Button>
        </div>

        <div className={styles.card}>
          <div className={styles.big}>١٥٪</div>
          <div className={styles.cap}>عمولة ثابتة لأول ١٠ فلل تنضم للمنصة</div>
          <hr />
          <p>بتدفع عمولة بس لما يتأكد الحجز — يعني ما في مخاطرة عليك، وما في التزام مسبق.</p>
          <Button href="#cta" block>
            سجّل فيلتك الآن
          </Button>
        </div>
      </div>
    </section>
  );
}
