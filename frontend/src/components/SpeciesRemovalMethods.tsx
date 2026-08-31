import type { RemovalMethod } from "../types";
import styles from "./SpeciesRemovalMethods.module.css";

export function SpeciesRemovalMethods({ methods }: { methods: RemovalMethod[] }) {
  if (methods.length === 0) return null;

  return (
    <div className={styles.list}>
      {methods.map((m) => (
        <div key={m.method} className={styles.item}>
          <div className={styles.method}>{m.method}</div>
          <dl className={styles.grid}>
            <dt>Timing</dt>
            <dd>{m.timing}</dd>
            {m.herbicide && (
              <>
                <dt>Herbicide</dt>
                <dd>{m.herbicide}</dd>
              </>
            )}
            <dt>How to</dt>
            <dd>{m.how_to}</dd>
            {m.notes && (
              <>
                <dt>Notes</dt>
                <dd>{m.notes}</dd>
              </>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
