import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "What is Cover Art Maker?",
    answer: "Cover Art Maker is a platform that allows users to create custom cover art ready for music streaming using artificial generative intelligence (AGI) and our own software."
  },
  {
    question: "What format is the cover art delivered?",
    answer: "The cover art is downloadable in JPG non-watermarked file 3000 x 3000 px ready for streaming."
  },
  {
    question: "How are the images generated?",
    answer: "We partner with AGI provider(s) to help produce cover art, as well as our own software."
  },
  {
    question: "How much does it cost?",
    answer: "We offer flexible pricing: purchase credit packs starting at $5 for 10 credits (1 credit = 1 cover generation), or subscribe to a monthly plan for even better value. Check our pricing page for current packages and subscription tiers."
  },
  {
    question: "Can I use the artwork for other things other than album cover art?",
    answer: "Yes, the cover artwork you create and purchase can be used for anything including podcast covers, posters, merch, greeting cards, etc."
  },
  {
    question: "What is the delivery time for add-ons?",
    answer: "Add-ons such as Spotify Canvas, Motion Cover, and other motion upgrades are delivered via email in 2-5 days. Real Designer Edits are delivered within 24 hours via email."
  },
  {
    question: "Is it legal to use the cover art for music streaming and other commercial uses?",
    answer: "Yes, you are legally permitted to utilize the cover art for music streaming and other commercial uses. However, it is expressly prohibited to engage in the resale of the cover art. Alterations are allowed to the cover art."
  },
  {
    question: "Do I own the copyright to the cover art?",
    answer: "For the United States, at this time the US Copyright Office has taken the position that AI-generated art cannot receive copyright protection. So theoretically, anyone can find and use your cover art without legal consequences. Copyrights vary by country and is fluid so check with your country's copyright office."
  }
];

export const FAQSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="text-sm font-medium text-primary">Got Questions?</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl tracking-wide mb-4">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto">
              Everything you need to know about Cover Art Maker and how it works.
            </p>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 text-base font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 pb-5 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};
