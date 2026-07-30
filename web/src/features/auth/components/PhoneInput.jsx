import { useState, useEffect, useRef } from 'react';
import {
  COUNTRIES,
  onlyDigits,
  formatPhone,
  detectCountry,
  getCountryByCode,
} from '../../../shared/utils/phoneUtils';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';
import CountryFlag from '../../../shared/components/CountryFlag';

/**
 * @param defaultCountry ISO code the field starts on. The picker stays open for
 *   business — someone on a Brazilian campaign may still hold a foreign number,
 *   and a locked +55 would leave them with no way to sign up at all. It only
 *   changes the starting point, and GeoIP does not override it.
 */
export default function PhoneInput({ value, onChange, onCountryChange, onFocus, defaultCountry, placeholder, className = '' }) {
  const { countryCode: geoCountryCode } = useAdvertiser();
  const [country, setCountry] = useState(() => {
    const initial = getCountryByCode(defaultCountry || detectCountry());
    if (onCountryChange) setTimeout(() => onCountryChange(initial), 0);
    return initial;
  });
  const [open, setOpen] = useState(false);
  const [manuallySelected, setManuallySelected] = useState(false);
  const dropdownRef = useRef(null);

  // Use country from AdvertiserContext GeoIP (ipapi.co, ip-api.com, ipwho.is)
  useEffect(() => {
    if (defaultCountry || manuallySelected || !geoCountryCode) return;
    const found = COUNTRIES.find((c) => c.code === geoCountryCode);
    if (found) {
      setCountry(found);
      if (onCountryChange) onCountryChange(found);
    }
  }, [geoCountryCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleInput = (e) => {
    const raw = onlyDigits(e.target.value);
    const limited = raw.slice(0, country.digits);
    onChange(limited);
  };

  const selectCountry = (c) => {
    setCountry(c);
    setOpen(false);
    setManuallySelected(true);
    if (onCountryChange) onCountryChange(c);
    // trim digits if new country has shorter max
    if (value.length > c.digits) {
      onChange(value.slice(0, c.digits));
    }
  };

  const formatted = formatPhone(value, country.mask);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent transition-all ${className}`}>
        {/* Country picker. Flags are drawn, not emoji — Windows renders the
            emoji as bare letters, which looks like a broken image. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={country.code}
          className="flex items-center gap-1.5 pl-3 pr-2 py-3.5 border-r border-gray-200 flex-shrink-0 hover:bg-gray-100 rounded-l-xl transition-colors"
        >
          <CountryFlag code={country.code} size={18} />
          <span className="text-gray-600 text-sm font-medium">{country.dial}</span>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Phone input */}
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={formatted}
          onChange={handleInput}
          onFocus={onFocus}
          placeholder={
            placeholder && country.code === defaultCountry
              ? placeholder
              : country.mask.replace(/_/g, '0')
          }
          className="flex-1 bg-transparent py-3.5 pl-3 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {/* Dropdown — the starting country first, so it is where the eye lands */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {[...COUNTRIES]
            .sort((a, b) => (a.code === country.code ? -1 : b.code === country.code ? 1 : 0))
            .map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => selectCountry(c)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${c.code === country.code ? 'bg-primary-50' : ''}`}
              >
                <CountryFlag code={c.code} size={20} />
                <span className="text-gray-700 text-sm font-medium">{c.dial}</span>
                <span className="text-gray-400 text-xs ml-auto">{c.code}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
