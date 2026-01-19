'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';

const themes = [
    { value: 'light' as const, label: 'Claro', icon: SunIcon },
    { value: 'dark' as const, label: 'Escuro', icon: MoonIcon },
    { value: 'system' as const, label: 'Sistema', icon: ComputerDesktopIcon },
];

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const CurrentIcon = theme === 'system'
        ? ComputerDesktopIcon
        : (resolvedTheme === 'dark' ? MoonIcon : SunIcon);

    return (
        <div className="theme-toggle-container" ref={dropdownRef}>
            <button
                className="theme-toggle-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Alterar tema"
                title="Alterar tema"
            >
                <CurrentIcon className="theme-icon" />
                <span className="theme-label">
                    {themes.find(t => t.value === theme)?.label}
                </span>
                <svg
                    className={`theme-chevron ${isOpen ? 'open' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                >
                    <path fill="currentColor" d="M6 8L1 3h10z" />
                </svg>
            </button>

            {isOpen && (
                <div className="theme-dropdown">
                    {themes.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            className={`theme-option ${theme === value ? 'active' : ''}`}
                            onClick={() => {
                                setTheme(value);
                                setIsOpen(false);
                            }}
                        >
                            <Icon className="theme-option-icon" />
                            <span>{label}</span>
                            {theme === value && (
                                <svg className="theme-check" width="16" height="16" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                    />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
