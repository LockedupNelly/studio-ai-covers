import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 6, 2026</p>
        
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect information you provide directly, including your Google account information 
              (name, email, profile picture), payment information processed through Stripe, and the 
              prompts and preferences you use to generate cover art.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to provide and improve the Service, process payments, send 
              service-related communications, and maintain your generation history. We do not sell 
              your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption. Generated images are 
              stored in secure cloud storage. We implement appropriate technical and organizational 
              measures to protect your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use third-party services including Google for authentication, Stripe for payment 
              processing, and AI providers for image generation. These services have their own 
              privacy policies governing their use of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and preferences. We may use analytics 
              tools to understand how users interact with the Service. You can control cookie settings 
              through your browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal data. You can download 
              your generation history from your profile. To request data deletion, contact us at 
              privacy@coverartmaker.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account information and generation history for as long as your account 
              is active. After account deletion, we may retain certain data for legal compliance 
              purposes for up to 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not intended for users under 13 years of age. We do not knowingly 
              collect personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant 
              changes via email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related inquiries, please contact us at privacy@coverartmaker.com.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
