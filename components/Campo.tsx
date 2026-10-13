import type { ReactNode } from "react";

export default function Campo({
  label,
  obrigatorio,
  larga,
  children,
}: {
  label: string;
  obrigatorio?: boolean;
  larga?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`campo${larga ? " col-2" : ""}`}>
      <span>
        {label}
        {obrigatorio ? "*" : ""}
      </span>
      {children}
    </label>
  );
}
