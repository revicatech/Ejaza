"use client";

import { Button } from "@/components/ui/Button";
import { SearchIcon } from "@/components/icons";
import { searchFields } from "@/lib/data/content";
import styles from "./SearchCard.module.css";

export function SearchCard() {
  function handleSearch() {
    // Placeholder search: scroll to the listings until real querying is wired.
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        {searchFields.map((field) => (
          <div key={field.label} className={styles.field}>
            <label>{field.label}</label>
            <select aria-label={field.label} defaultValue={field.options[0]}>
              {field.options.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
        <div className={styles.submit}>
          <Button variant="icon" aria-label="بحث" onClick={handleSearch}>
            <SearchIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
