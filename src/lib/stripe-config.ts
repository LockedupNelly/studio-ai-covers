// Credit packages (one-time purchase)
export const CREDIT_PACKAGES = [
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
    popular: true,
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
      "150 Generations / Month",
      "Priority Processing",
      "10% Off Add-Ons",
      "Priority Support",
      "Early Access Features",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    price: 49.99,
    priceId: "price_1SdJVFFTlHtQpdKRfxzR9oXJ",
    productId: "prod_TaUUG2rRmV18Nz",
    features: [
      "500 Generations / Month",
      "Fastest Processing",
      "20% Off Add-Ons",
      "Dedicated Support",
      "Early Access Features",
      "Commercial License",
      "API Access",
    ],
  },
};