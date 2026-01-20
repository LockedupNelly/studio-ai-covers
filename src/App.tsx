import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsent } from "@/components/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Critical path - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Prefetch DesignStudio after homepage loads (most common next page)
const prefetchDesignStudio = () => import("./pages/DesignStudio");

// Lazy load heavy pages for faster initial bundle
const DesignStudio = lazy(() => import("./pages/DesignStudio"));
const EditStudio = lazy(() => import("./pages/EditStudio"));
const Profile = lazy(() => import("./pages/Profile"));
const PurchaseCredits = lazy(() => import("./pages/PurchaseCredits"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Contact = lazy(() => import("./pages/Contact"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FAQ = lazy(() => import("./pages/FAQ"));
const AdminExport = lazy(() => import("./pages/AdminExport"));
const AdminGenerations = lazy(() => import("./pages/AdminGenerations"));

// Minimal loading fallback - instant show with subtle animation
const PageLoader = () => (
  <div className="min-h-screen bg-background" />
);

// Prefetch hook for route-based preloading
const RoutePrefetcher = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Prefetch DesignStudio when on homepage
    if (location.pathname === "/") {
      const timer = setTimeout(prefetchDesignStudio, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);
  
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <CookieConsent />
          <BrowserRouter>
            <RoutePrefetcher />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/design-studio" element={<DesignStudio />} />
                <Route path="/edit-studio" element={<EditStudio />} />
                <Route path="/purchase-credits" element={<PurchaseCredits />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/admin/export" element={<AdminExport />} />
                <Route path="/admin/generations" element={<AdminGenerations />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
