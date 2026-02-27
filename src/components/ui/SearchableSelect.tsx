import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
    value: string | number;
    label: string;
    subLabel?: string;
    badge?: {
        text: string;
        color: string;
        bgColor: string;
    };
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string | number | undefined | null;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    searchPlaceholder?: string;
    startIcon?: React.ReactNode;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    label,
    className = '',
    disabled = false,
    required = false,
    searchPlaceholder = 'Buscar...',
    startIcon
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(option =>
            option.label.toLowerCase().includes(term) ||
            option.subLabel?.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    // Get selected option object
    const selectedOption = useMemo(() => {
        return options.find(o => String(o.value) === String(value));
    }, [options, value]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus search input when opening
            if (searchInputRef.current) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string | number) => {
        onChange(String(optionValue));
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-neutral-800 border rounded-xl transition-all focus:outline-none focus:ring-4 focus:ring-olive-500/10 ${isOpen
                    ? 'border-olive-500 ring-4 ring-olive-500/10'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    } ${disabled ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-900' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-2 truncate">
                    {startIcon && <span className="flex-shrink-0 text-neutral-500">{startIcon}</span>}
                    {selectedOption ? (
                        <div className="flex flex-col items-start truncate">
                            <span className={`font-medium text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-2`}>
                                {selectedOption.label}
                                {selectedOption.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${selectedOption.badge.bgColor} ${selectedOption.badge.color}`}>
                                        {selectedOption.badge.text}
                                    </span>
                                )}
                            </span>
                            {selectedOption.subLabel && (
                                <span className="text-xs text-neutral-500 truncate">{selectedOption.subLabel}</span>
                            )}

                        </div>
                    ) : (
                        <span className="text-neutral-400 font-medium">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {selectedOption && !required && !disabled && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {/* Search Input */}
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-8 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                                onClick={(e) => e.stopPropagation()}
                            />
                            {searchTerm && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchTerm('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400 flex flex-col items-center gap-2">
                                <Search className="w-8 h-8 opacity-20" />
                                <p>No se encontraron resultados</p>
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = String(option.value) === String(value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between group ${isSelected
                                            ? 'bg-olive-50 dark:bg-olive-900/20 text-olive-700 dark:text-olive-300'
                                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                            }`}
                                    >
                                        <div className="flex flex-col truncate pr-2">
                                            <span className={`text-sm truncate flex items-center gap-2 ${isSelected ? 'font-bold' : 'font-medium'}`}>
                                                {option.label}
                                                {option.badge && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${option.badge.bgColor} ${option.badge.color}`}>
                                                        {option.badge.text}
                                                    </span>
                                                )}
                                            </span>
                                            {option.subLabel && (
                                                <span className={`text-xs truncate ${isSelected ? 'text-olive-600/70 dark:text-olive-400/70' : 'text-neutral-500'}`}>
                                                    {option.subLabel}
                                                </span>
                                            )}
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-olive-600 flex-shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
