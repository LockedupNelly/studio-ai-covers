import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FAQSection } from "@/components/FAQSection";
import { SEO } from "@/components/SEO";
import { FAQPageSchema, BreadcrumbSchema } from "@/components/StructuredData";
import { FAQ_ITEMS, SITE_CONFIG } from "@/lib/seo-config";

const FAQ = () => {
  const breadcrumbs = [
    { name: "Home", url: SITE_CONFIG.url },
    { name: "FAQ", url: `${SITE_CONFIG.url}/faq` }
  ];

  return (
    <>
      <SEO pageKey="faq" />
      <FAQPageSchema items={FAQ_ITEMS} />
      <BreadcrumbSchema items={breadcrumbs} />
      
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <FAQSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default FAQ;
