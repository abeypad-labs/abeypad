import { Sidebar } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <Sidebar>
      <Outlet />
    </Sidebar>
  );
}
