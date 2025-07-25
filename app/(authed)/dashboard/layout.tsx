// app/authed/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Puoi mettere qui header, sidebar, footer specifici per dashboard */}
      {children}
    </div>
  );
}
