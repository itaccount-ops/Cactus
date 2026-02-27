'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

interface Project {
    id: string;
    code: string;
    name: string;
}

interface SearchableProjectSelectProps {
    projects: Project[];
    value: string;
    onChange: (projectId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export default function SearchableProjectSelect({
    projects,
    value,
    onChange,
    placeholder = 'Buscar proyecto...',
    disabled = false,
    className = ''
}: SearchableProjectSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Find selected project
    const selectedProject = projects.find(p => p.id === value);

    // Filter projects based on search query
    const filteredProjects = projects.filter(project => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            project.code.toLowerCase().includes(query) ||
            project.name.toLowerCase().includes(query)
        );
    });

    // Reset highlighted index when filtered list changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredProjects.length]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = useCallback((projectId: string) => {
        onChange(projectId);
        setIsOpen(false);
        setSearchQuery('');
    }, [onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredProjects.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredProjects[highlightedIndex]) {
                    handleSelect(filteredProjects[highlightedIndex].id);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchQuery('');
                break;
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchQuery('');
        inputRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className={`relative ${className}`}
        >
            {/* Input field */}
            <div
                className={`
                    flex items-center gap-2 w-full px-3 py-2 
                    border border-neutral-300 dark:border-neutral-600 rounded-lg 
                    bg-white dark:bg-neutral-700
                    ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                `}
                onClick={() => !disabled && setIsOpen(true)}
            >
                <Search size={16} className="text-neutral-400 flex-shrink-0" />

                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                        autoFocus
                        disabled={disabled}
                    />
                ) : (
                    <span className={`flex-1 truncate ${selectedProject ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'}`}>
                        {selectedProject
                            ? `${selectedProject.code} · ${selectedProject.name}`
                            : placeholder
                        }
                    </span>
                )}

                {value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded transition-colors"
                    >
                        <X size={14} className="text-neutral-400" />
                    </button>
                )}

                <ChevronDown
                    size={16}
                    className={`text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </div>

            {/* Dropdown */}
            {isOpen && !disabled && (
                <ul
                    ref={listRef}
                    className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg"
                >
                    {filteredProjects.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-neutral-500 text-center">
                            No se encontraron proyectos
                        </li>
                    ) : (
                        filteredProjects.map((project, index) => (
                            <li
                                key={project.id}
                                onClick={() => handleSelect(project.id)}
                                className={`
                                    px-3 py-2 cursor-pointer flex items-center gap-2
                                    ${index === highlightedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'}
                                    ${project.id === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                `}
                            >
                                <span className="font-mono text-sm text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
                                    {project.code}
                                </span>
                                <span className="text-neutral-600 dark:text-neutral-300 truncate">
                                    {project.name}
                                </span>
                                {project.id === value && (
                                    <Check size={16} className="ml-auto text-blue-600 flex-shrink-0" />
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
