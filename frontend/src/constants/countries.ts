export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  formatPlaceholder: string;
  minLength: number;
  maxLength: number;
}

export const COUNTRIES: Country[] = [
  { name: 'Morocco', code: 'MA', dialCode: '+212', flag: '🇲🇦', formatPlaceholder: '612 345 678', minLength: 9, maxLength: 9 },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷', formatPlaceholder: '6 12 34 56 78', minLength: 9, maxLength: 9 },
  { name: 'Spain', code: 'ES', dialCode: '+34', flag: '🇪🇸', formatPlaceholder: '612 345 678', minLength: 9, maxLength: 9 },
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸', formatPlaceholder: '202 555 0123', minLength: 10, maxLength: 10 },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧', formatPlaceholder: '7911 123456', minLength: 10, maxLength: 10 },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪', formatPlaceholder: '50 123 4567', minLength: 9, maxLength: 9 },
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966', flag: '🇸🇦', formatPlaceholder: '50 123 4567', minLength: 9, maxLength: 9 },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪', formatPlaceholder: '151 23456789', minLength: 10, maxLength: 11 },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦', formatPlaceholder: '416 555 0123', minLength: 10, maxLength: 10 },
];
