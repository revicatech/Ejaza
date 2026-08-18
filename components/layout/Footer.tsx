import { footerColumns } from "@/lib/data/navigation";
import { site } from "@/lib/data/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <a href="#" className={styles.logo}>
            <span className={styles.mark} />
            {site.name}
          </a>
          <p>{site.description}</p>
          <div className={styles.social}>
            <a href="#" aria-label="انستغرام">◐</a>
            <a href={site.whatsappUrl} aria-label="واتساب" target="_blank" rel="noopener noreferrer">✆</a>
            <a href={site.emailUrl} aria-label="البريد">✉</a>
          </div>
        </div>

        {footerColumns.map((col) => (
          <div key={col.title} className={styles.col}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.wordmark}>{site.name}</div>

      <div className={styles.bottom}>
        <span>© ٢٠٢٦ {site.name}. جميع الحقوق محفوظة.</span>
        <span>{site.location}</span>
      </div>
    </footer>
  );
}
