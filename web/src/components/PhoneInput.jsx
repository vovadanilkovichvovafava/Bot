import { useState, useEffect, useRef } from 'react';
import {
  COUNTRIES,
  onlyDigits,
  formatPhone,
  detectCountry,
  getCountryByCode,
} from '../utils/phoneUtils';

export default function PhoneInput({ value, onChange, onCountryChange, className = '' }) {
  const [country, setCountry] = useState(() => {
    const initial = getCountryByCode(detectCountry());
    // Notify parent of initial country on mount
    if (onCountryChange) setTimeout(() => onCountryChange(initial), 0);
    return initial;
  });
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        {/* Country selector */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 pl-3 pr-2 py-3.5 border-r border-gray-200 flex-shrink-0 hover:bg-gray-100 rounded-l-xl transition-colors"
        >
          <span className="text-lg leading-none">{country.flag}</span>
          <span className="text-gray-500 text-sm font-medium">{country.dial}</span>
          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Phone input */}
        <input
          type="tel"
          inputMode="numeric"
          value={formatted}
          onChange={handleInput}
          placeholder={country.mask.replace(/_/g, '0')}
          className="flex-1 bg-transparent py-3.5 pl-3 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => selectCountry(c)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${c.code === country.code ? 'bg-primary-50' : ''}`}
            >
              <span className="text-lg">{c.flag}</span>
              <span className="text-gray-700 text-sm font-medium">{c.dial}</span>
              <span className="text-gray-400 text-xs ml-auto">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
