"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./Gallery.module.css";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className={styles.gallery}>
        <div className={styles.main}>
          <div className={styles.placeholder}>لا تتوفر صور بعد</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <Image
          src={images[active]}
          alt={alt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 1100px"
          style={{ objectFit: "cover" }}
        />
      </div>

      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              className={`${styles.thumb} ${i === active ? styles.thumbActive : ""}`}
              onClick={() => setActive(i)}
              aria-label={`صورة ${i + 1}`}
              aria-current={i === active}
            >
              <Image src={src} alt="" fill sizes="96px" style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
