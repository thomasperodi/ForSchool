// import NavbarAuth from "@/components/NavbarAuth";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {


  return (
    <SidebarProvider>
      <div className="hidden md:block">
        {/* <NavbarAuth /> */}
      </div>
      <div className="block md:hidden">
        <AppSidebar />
      </div>
      <main className="w-full  ">{children}</main>
    </SidebarProvider>
  );
}
