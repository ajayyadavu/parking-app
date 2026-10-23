import { ShieldCheck } from "lucide-react";
import EmptyState from "../components/EmptyState";

export default function AdminPanel() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin panel</h1>
          <p>Rate management and platform overview.</p>
        </div>
      </div>
      <EmptyState icon={ShieldCheck} title="Coming in Step 6" text="Yaha hourly rate change aur platform stats aayenge." />
    </>
  );
}