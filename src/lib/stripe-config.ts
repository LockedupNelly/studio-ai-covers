// Credit packages (one-time purchase)
export const CREDIT_PACKAGES = [
  {
    id: "100",
    credits: 100,
    price: 1,
    priceId: "price_1ShZLYFTlHtQpdKRw3OG5qhf",
    popular: true,
  },
  {
    id: "10",
    credits: 10,
    price: 5,
    priceId: "price_1SdJUPFTlHtQpdKR3VROMY2P",
    popular: false,
  },
  {
    id: "50",
    credits: 50,
    price: 20,
    priceId: "price_1SdJUbFTlHtQpdKRJDQrJSPY",
    popular: false,
  },
  {
    id: "150",
    credits: 150,
    price: 50,
    priceId: "price_1SdJUlFTlHtQpdKRBrIVTSJK",
    popular: false,
  },
];

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 9.99,
    priceId: "price_1SdJUvFTlHtQpdKR1afB5KaB",
    productId: "prod_TaUTWhd9yIEw4B",
    features: [
      "50 Generations / Month",
      "Standard Processing",
      "10% Off Add-Ons",
      "Email Support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 19.99,
    priceId: "price_1SdJV4FTlHtQpdKROOy0GQGD",
    productId: "prod_TaUUCtQXelHcBD",
    features: [
      "Unlimited Generations",
      "Priority Processing",
      "10% Off Add-Ons",
      "Priority Support",
      "Early Access Features",
      "Real Designer Edits",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: 49.99,
    priceId: "price_1SdJVFFTlHtQpdKRfxzR9oXJ",
    productId: "prod_TaUUG2rRmV18Nz",
    features: [
      "Unlimited Generations",
      "Fastest Processing",
      "20% Off Add-Ons",
      "Dedicated Support",
      "Early Access Features",
      "Commercial License",
      "API Access",
      "Real Designer Edits (Priority)",
    ],
  },
};