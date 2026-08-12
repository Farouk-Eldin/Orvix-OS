import { Navbar } from "@/features/landing/components/navbar";
import { Footer } from "@/features/landing/components/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
