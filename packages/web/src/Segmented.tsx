import { useId } from "react";

interface Props<T extends string> {
  label: string;
  showLabel?: boolean;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ label, showLabel = true, options, value, onChange, className }: Props<T>) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`segmented ${className ?? ""}`.trim()}>
      {showLabel && (
        <span className="segmented-label" aria-hidden="true">
          {label}
        </span>
      )}
      <div className="segments">
        {options.map((option) => (
          <label key={option.value} className="segment">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
