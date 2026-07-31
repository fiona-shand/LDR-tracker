import NavLinks from "@/components/nav-links";
import PageTransition from "@/components/page-transition";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-surface-border/80 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end px-4 py-3 sm:px-6">
          <NavLinks />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
