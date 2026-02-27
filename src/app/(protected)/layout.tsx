import Sidebar from '@/components/layout/Sidebar';
import MobileSidebar from '@/components/layout/MobileSidebar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import SessionProvider from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import MainLayoutWrapper from '@/components/layout/MainLayoutWrapper';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
    let session;
    try {
        session = await auth();
    } catch (e) {
        console.error("Auth failed in ProtectedLayout:", e);
        // Fallback to null session -> redirect below
        session = null;
    }

    if (!session) {
        redirect('/login');
    }

    return (
        <SessionProvider>
            <ErrorBoundary>
                <ToastProvider>
                    <SidebarProvider>
                        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex font-sans text-neutral-900 dark:text-neutral-100 transition-colors">
                            {/* Desktop Sidebar */}
                            <div className="hidden lg:block">
                                <Sidebar />
                            </div>

                            {/* Mobile Sidebar */}
                            <MobileSidebar />

                            {/* Dynamic Main Content & Header */}
                            <MainLayoutWrapper>
                                {children}
                            </MainLayoutWrapper>
                        </div>
                    </SidebarProvider>
                </ToastProvider>
            </ErrorBoundary>
        </SessionProvider>
    );
}
