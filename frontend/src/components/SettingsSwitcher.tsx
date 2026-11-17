"use client";

import { CURRENCIES } from "@/lib/money";
import { LOCALES } from "@/lib/i18n/messages";
import { useSettings } from "@/lib/i18n/SettingsContext";

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex overflow-hidden rounded border text-xs">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`px-2 py-1 uppercase ${
            option === value ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-gray-100 dark:hover:bg-zinc-800"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Language (ES/EN) and display currency (COP/USD) pickers. */
export function SettingsSwitcher({ showCurrency = true }: { showCurrency?: boolean }) {
  const { t, locale, currency, setLocale, setCurrency } = useSettings();
  return (
    <div className="flex items-center gap-2">
      <Toggle label={t.common.language} options={LOCALES} value={locale} onChange={setLocale} />
      {showCurrency && <Toggle label={t.common.currency} options={CURRENCIES} value={currency} onChange={setCurrency} />}
    </div>
  );
}
