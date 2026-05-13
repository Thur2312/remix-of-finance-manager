import { TrialBanner } from "@/components/TrialBanner";
import { PaywallModal } from "@/components/PaywallModal";

export function TrialGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PaywallModal />
    </>
  );
}