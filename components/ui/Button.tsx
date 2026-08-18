import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "light" | "icon" | "arrow";

interface BaseProps {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

interface LinkProps extends BaseProps {
  href: string;
  external?: boolean;
  ariaLabel?: string;
}

interface ActionProps extends BaseProps, Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "aria-label"> {
  href?: undefined;
}

function classesFor(variant: Variant, block?: boolean, extra?: string) {
  const shape = variant === "icon" || variant === "arrow";
  return [
    shape ? styles[variant] : styles.btn,
    !shape ? styles[variant] : "",
    block ? styles.block : "",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: LinkProps | ActionProps) {
  const { variant = "primary", block, children, className } = props;
  const classes = classesFor(variant, block, className);

  if (typeof props.href === "string") {
    const external = props.external || /^https?:|^mailto:/.test(props.href);
    return (
      <a
        href={props.href}
        className={classes}
        aria-label={props.ariaLabel}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      className={classes}
      onClick={props.onClick}
      aria-label={props["aria-label"]}
    >
      {children}
    </button>
  );
}
