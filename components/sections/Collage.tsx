"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import styles from "./Collage.module.css";

const collageSets: string[][] = [
  [
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
  ],
];

const alts = ["مساحة معيشة بإضاءة دافئة", "واجهة عصرية عند الغروب", "تفصيل داخلي بسيط"];
const cellClass = [styles.c1, styles.c2, styles.c3];

export function Collage() {
  const [index, setIndex] = useState(0);
  const set = collageSets[index];
  const count = collageSets.length;

  return (
    <div className={styles.collage}>
      {set.map((src, i) => (
        <div key={cellClass[i]} className={`${styles.item} ${cellClass[i]}`}>
          <Image src={src} alt={alts[i]} fill sizes="(max-width: 900px) 100vw, 40vw" />
        </div>
      ))}
      <div className={styles.controls}>
        <Button variant="arrow" aria-label="السابق" onClick={() => setIndex((i) => (i - 1 + count) % count)}>
          <ChevronRight />
        </Button>
        <Button variant="arrow" aria-label="التالي" onClick={() => setIndex((i) => (i + 1) % count)}>
          <ChevronLeft />
        </Button>
      </div>
    </div>
  );
}
