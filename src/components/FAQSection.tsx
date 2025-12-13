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
    answer: "Free to try up to 6 covers generated, then you can either buy one of the six for $4.99 or purchase up to 30 cover generations and download one for $4.99 or stop. So simply put it costs $4.99 per cover art generated and downloaded. If it takes more than 30 generations to create your cover art you can purchase an additional 30 cover generations for $4.99. Note: it is rare that a musician cannot generate a cover they love in more than 30 generations. Our average cover generation is eight (8)."
  },
  {
    question: "Why are the cover images watermarked?",
    answer: "We watermark the images to prevent theft. We pay AI providers per image generated. Our mission is to provide affordable, easy to generate AI album cover art for musicians that need cover art for the next drop. If you are looking to just play and learn AI, we get that but we are not the site for you."
  },
  {
    question: "Can I use the artwork for other things other than album cover art?",
    answer: "Yes, the cover artwork you create and purchase can be used for anything including podcast covers, posters, merch, greeting cards, etc."
  },
  {
    question: "How is the Cover Art delivered? What is the delivery time?",
    answer: "The cover art is immediately available to download after checkout. The Spotify Canvas, Motion Cover, and Pro Designer Added Song Title and Artist Name are delivered via email in 2-5 days."
  },
  {
    question: "How and what format are the optional Spotify Canvas Cover Art and Motion Cover Art delivered?",
    answer: "Spotify Canvas is a 3-8 second looping animated visual of your cover art that shows in vertical format (9:16) and is delivered as an MP4 file for Spotify. According to Spotify, when listeners see a Canvas Song, 5% are more likely to keep listening, 145% share the track, 20% add to their playlists. Artists with fewer than 1000 followers who use Canvas see an average 80% more streams and saves. Motion covers are an animated 30-second clip of your regular cover and can be extended for the length of your song. When you purchase a motion cover, you will receive both the regular cover (.JPEG) and the motion cover (.MP4)."
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
