import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';

interface CustomDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ label, options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayValue = value ? options.find(o => o === value) || placeholder : placeholder;

  return (
    <div 
        className="relative" 
        ref={dropdownRef}
        onMouseLeave={() => setIsOpen(false)}
    >
        <label htmlFor={label} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <button
            id={label}
            type="button"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white text-left flex justify-between items-center"
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={() => setIsOpen(true)}
        >
            <span className="truncate">{displayValue}</span>
            <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
            <div 
                className="absolute z-20 w-full mt-1 bg-white rounded-md shadow-lg border border-slate-200"
                onMouseEnter={() => setIsOpen(true)}
            >
                <ul className="max-h-60 overflow-y-auto py-1">
                    <li>
                        <button
                            onClick={() => handleSelect('')}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-brand-light"
                        >
                            <span className="font-semibold">{placeholder}</span>
                        </button>
                    </li>
                    {options.map((option) => (
                        <li key={option}>
                            <button
                                onClick={() => handleSelect(option)}
                                className={`w-full text-left px-4 py-2 text-sm ${
                                    value === option ? 'bg-brand-primary text-white' : 'text-slate-700 hover:bg-brand-light'
                                }`}
                            >
                                {option}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
  );
};

export default CustomDropdown;