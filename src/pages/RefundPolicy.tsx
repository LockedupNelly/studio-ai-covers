import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 6, 2026</p>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Commitment to You</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Cover Art Maker, we want you to be completely satisfied with your experience. 
              We understand that AI-generated art may not always meet your expectations, and we've 
              designed our refund policy to be fair and hassle-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">No-Hassle Refund for Generation Issues</h2>
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
              <p className="text-foreground font-medium">
                If the AI consistently fails to generate what you're prompting, we'll refund your credits—no questions asked.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              We believe in the quality of our AI generation system. However, if you experience 
              repeated issues where the generated cover art doesn't match your prompts or expectations, 
              simply contact us and we'll issue a full credit refund for the affected generations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Credit Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Credit purchases are eligible for refunds under the following conditions:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Unused credits may be refunded within 30 days of purchase</li>
              <li>Technical issues preventing credit usage qualify for immediate refund</li>
              <li>Duplicate purchases will be refunded automatically</li>
              <li>Credits used for generations that failed due to system errors will be restored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Subscription Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For subscription plans (Starter, Pro, Studio):
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Cancel anytime—you'll retain access until the end of your billing period</li>
              <li>New subscribers can request a full refund within 7 days if unsatisfied</li>
              <li>Pro-rated refunds are available for annual plans cancelled within 30 days</li>
              <li>You can manage your subscription directly through the Stripe Customer Portal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Add-On Purchases</h2>
            <p className="text-muted-foreground leading-relaxed">
              Add-on products (motion graphics, videos, etc.) are custom-generated and generally 
              non-refundable once delivered. However, if the delivered product has significant 
              quality issues or doesn't match the specifications, please contact us for a resolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Requesting a refund is simple:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Email us at <a href="mailto:support@coverartmaker.com" className="text-primary hover:underline">support@coverartmaker.com</a></li>
              <li>Include your account email and a brief description of the issue</li>
              <li>If applicable, share examples of prompts that didn't generate as expected</li>
              <li>We'll respond within 24-48 hours with a resolution</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Processing Time</h2>
            <p className="text-muted-foreground leading-relaxed">
              Approved refunds are processed within 5-10 business days. Refunds will be issued 
              to the original payment method used for the purchase. Credit restorations are 
              applied immediately to your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              Have questions about our refund policy? We're here to help.{" "}
              <a href="/contact" className="text-primary hover:underline">Contact our support team</a>{" "}
              or email us directly at{" "}
              <a href="mailto:support@coverartmaker.com" className="text-primary hover:underline">
                support@coverartmaker.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RefundPolicy;
