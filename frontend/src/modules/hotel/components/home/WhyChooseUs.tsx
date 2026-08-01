import { ShieldCheck, Sparkles, Clock, HeartHandshake } from "lucide-react";

const POINTS = [
  {
    icon: Sparkles,
    title: "Premium Comfort",
    desc: "Every room is curated with elegant interiors and premium amenities for a truly restful stay.",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Secure",
    desc: "24/7 security, hygienic housekeeping, and verified staff ensure your complete peace of mind.",
  },
  {
    icon: Clock,
    title: "Round-the-Clock Service",
    desc: "Our concierge and support teams are available at any hour to make your stay effortless.",
  },
  {
    icon: HeartHandshake,
    title: "Warm Hospitality",
    desc: "Personalised attention and genuine care — the hallmark of the 7 Vachan experience.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-ink text-cream py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="section-eyebrow justify-center flex">Our Promise</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-cream leading-tight">
            Why Guests Choose 7 Vachan
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-5">
                <Icon size={24} className="text-gold" />
              </div>
              <h3 className="font-display text-lg text-cream mb-2">{title}</h3>
              <p className="text-cream/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
