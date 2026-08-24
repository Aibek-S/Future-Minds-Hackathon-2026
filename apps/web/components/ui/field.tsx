"use client";

export function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  maxLength,
  min,
  max,
  defaultValue,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  defaultValue?: string | number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-text-2">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-md border-2 border-border bg-surface px-4 text-[15px] outline-none transition placeholder:text-text-3 focus:border-primary focus:bg-primary-subtle/40"
      />
    </label>
  );
}
