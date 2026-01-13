import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const PaymentCanceledContent = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>

            <h1 className="font-display text-3xl mb-4">
              PAYMENT <span className="text-foreground/60">CANCELED</span>
            </h1>

            <p className="text-foreground/60 mb-8">
              Your payment was canceled. No charges were made. You can try again anytime.
            </p>

            <div className="flex flex-col gap-3">
              <Button variant="studio" onClick={() => navigate("/purchase-credits")}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const PaymentCanceled = () => (
  <ErrorBoundary>
    <PaymentCanceledContent />
  </ErrorBoundary>
);

export default PaymentCanceled;