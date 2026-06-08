'use client';

import { Header } from '@/components/Header';
import { MobileFarmTabs } from '@/components/mobile-farm/MobileFarmTabs';

export default function MobileFarmPage() {
    return (
        <div className="animate-fadeIn pb-12">
            <Header />

            <div className="container mx-auto px-4 max-w-7xl mt-6">
                <MobileFarmTabs />
            </div>
        </div>
    );
}
