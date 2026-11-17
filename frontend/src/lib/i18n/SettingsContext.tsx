"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { copPerUsd, formatMoney as formatMoneyRaw, type Currency } from "@/lib/money";
import { INTL_LOCALE, MESSAGES, type Locale, type Messages } from "./messages";

// Language + display currency, chosen by the user and remembered per browser
// (localStorage). Defaults are Spanish + COP, which is what the prices are stored in.

const STORAGE_KEY = "food-opt:settings";

type Settings = { locale: Locale; currency: Currency };

const DEFAULT_SETTINGS: Settings = { locale: "es", currency: "COP" };

type SettingsValue = Settings & {
  t: Messages;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  /** Formats an amount stored in COP in the chosen display currency. */
  formatMoney: (amountCop: number) => string;
  formatDate: (iso: string, options?: Intl.DateTimeFormatOptions) => string;
  rate: number;
};

const SettingsContext = createContext<SettingsValue | null>(null);

function readStored(): Settings {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return {
      locale: parsed?.locale === "en" ? "en" : "es",
      currency: parsed?.currency === "USD" ? "USD" : "COP",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Start from the defaults so server and first client render match; the stored
  // choice is applied right after mount.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setSettings(readStored());
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.locale;
  }, [settings.locale]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode / blocked storage: the choice just won't survive a reload.
      }
      return next;
    });
  }, []);

  const value = useMemo<SettingsValue>(() => {
    const intlLocale = INTL_LOCALE[settings.locale];
    const rate = copPerUsd();
    return {
      ...settings,
      t: MESSAGES[settings.locale],
      setLocale: (locale) => update({ locale }),
      setCurrency: (currency) => update({ currency }),
      formatMoney: (amountCop) => formatMoneyRaw(amountCop, settings.currency, intlLocale, rate),
      formatDate: (iso, options) => new Date(iso).toLocaleDateString(intlLocale, options),
      rate,
    };
  }, [settings, update]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings must be used inside SettingsProvider");
  return value;
}
