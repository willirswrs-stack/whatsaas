'use client';

interface StatCardProps {
    label: string;
    value: string | number;
    change?: {
        value: string;
        positive: boolean;
    };
    icon?: React.ReactNode;
}

export function StatCard({ label, value, change, icon }: StatCardProps) {
    return (
        <div className="stat-card">
            <div className="flex items-center justify-between">
                <span className="stat-label">{label}</span>
                {icon && (
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--accent-primary)]">
                        {icon}
                    </div>
                )}
            </div>
            <span className="stat-value">{value}</span>
            {change && (
                <span className={`stat-change ${change.positive ? 'positive' : 'negative'}`}>
                    {change.positive ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18,15 12,9 6,15" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6,9 12,15 18,9" />
                        </svg>
                    )}
                    {change.value}
                </span>
            )}
        </div>
    );
}
