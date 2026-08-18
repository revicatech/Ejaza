import type { ReactNode } from "react";
import styles from "./Eyebrow.module.css";

interface EyebrowProps {
  children: ReactNode;
  onDark?: boolean;
  center?: boolean;
}

export function Eyebrow({ children, onDark, center }: EyebrowProps) {
  const classes = [styles.eyebrow, onDark ? styles.onDark : "", center ? styles.center : ""]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}
