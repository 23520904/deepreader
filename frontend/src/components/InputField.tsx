type InputFieldProps = {
  id: string;
  label: string;
  value: string;
  type?: "text" | "email" | "tel" | "number";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  onChange: (value: string) => void;
};

export function InputField({
  id,
  label,
  value,
  type = "text",
  autoComplete,
  inputMode,
  required = true,
  minLength,
  maxLength,
  onChange,
}: InputFieldProps) {
  return (
    <div className="relative">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[8px] border border-[#c8ccd6] bg-white px-4 text-[14px] text-[#17213a] outline-none transition placeholder:text-[#9095a1] focus:border-[#255895] focus:ring-4 focus:ring-[#255895]/10 sm:h-12"
      />
    </div>
  );
}
