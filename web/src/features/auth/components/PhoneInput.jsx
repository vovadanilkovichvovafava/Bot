import { useState, useEffect, useRef } from 'react';
import {
  COUNTRIES,
  onlyDigits,
  formatPhone,
  detectCountry,
  getCountryByCode,
} from '../../../shared/utils/phoneUtils';
import { useAdvertiser } from '../../../shared/context/AdvertiserContext';

export default function PhoneInput({ value, onChange, onCountryChange, onFocus, className = '', dark = false }) {
  const { countryCode: geoCountryCode } = useAdvertiser();
  const [country, setCountry] = useState(() => {
    const initial = getCountryByCode(detectCountry());
    if (onCountryChange) setTimeout(() => onCountryChange(initial), 0);
    return initial;
  });
  const [open, setOpen] = useState(false);
  const [manuallySelected, setManuallySelected] = useState(false);
  const dropdownRef = useRef(null);

  // Use country from AdvertiserContext GeoIP (ipapi.co, ip-api.com, ipwho.is)
  useEffect(() => {
    if (manuallySelected || !geoCountryCode) return;
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
      <div className={`flex items-center border rounded-xl transition-all ${dark
        ? 'bg-white/5 border-white/10 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent'
        : 'bg-gray-50 border-gray-200 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent'} ${className}`}>
        {/* Country selector */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1 pl-3 pr-2 py-3.5 border-r flex-shrink-0 rounded-l-xl transition-colors ${dark ? 'border-white/10 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'}`}
        >
          <span className="text-lg leading-none">{country.flag}</span>
          <span className={`text-sm font-medium ${dark ? 'text-white/70' : 'text-gray-500'}`}>{country.dial}</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${dark ? 'text-white/40' : 'text-gray-400'} ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Phone input */}
        <input
          type="tel"
          inputMode="numeric"
          value={formatted}
          onChange={handleInput}
          onFocus={onFocus}
          placeholder={country.mask.replace(/_/g, '0')}
          className={`flex-1 bg-transparent py-3.5 pl-3 pr-4 focus:outline-none ${dark ? 'text-white placeholder-white/30' : 'text-gray-900 placeholder-gray-400'}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`absolute top-full left-0 right-0 mt-1 border rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto ${dark ? 'bg-[#13203f] border-white/10' : 'bg-white border-gray-200'}`}>
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${dark
                ? `hover:bg-white/5 ${c.code === country.code ? 'bg-white/10' : ''}`
                : `hover:bg-gray-50 ${c.code === country.code ? 'bg-primary-50' : ''}`}`}
            >
              <span className="text-lg">{c.flag}</span>
              <span className={`text-sm font-medium ${dark ? 'text-white/80' : 'text-gray-700'}`}>{c.dial}</span>
              <span className={`text-xs ml-auto ${dark ? 'text-white/40' : 'text-gray-400'}`}>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
