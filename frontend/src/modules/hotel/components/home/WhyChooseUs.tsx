import { ShieldCheck, Sparkles, Clock, HeartHandshake } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

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
    <section className="section relative overflow-hidden bg-ink text-cream">
      {/* Warm light bloom + a hairline grid of gold rules for depth. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[880px] -translate-x-1/2 rounded-full bg-gold/[0.08] blur-[130px]"
      />

      <div className="container-luxe relative">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <Reveal duration={0.6}>
            <p className="section-eyebrow flex justify-center">Our Promise</p>
          </Reveal>
          <TextReveal
            as="h2"
            text="Why guests return"
            className="font-display text-display-md font-normal text-cream"
            delay={0.05}
          />
        </div>

        <Stagger
          className="grid grid-cols-1 gap-px overflow-hidden rounded-luxe border border-cream/10 bg-cream/10 sm:grid-cols-2 lg:grid-cols-4"
          stagger={0.1}
        >
          {POINTS.map(({ icon: Icon, title, desc }) => (
            <StaggerItem key={title}>
              {/* Hairline-divided cells: the 1px gaps come from the parent's
                  gap-px over a tinted background, so there are no double borders. */}
              <div className="group h-full bg-ink px-8 py-12 text-center transition-colors duration-600 ease-luxe hover:bg-ink-light">
                <span
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/25
                             transition-all duration-600 ease-luxe group-hover:border-gold/60 group-hover:bg-gold/10"
                >
                  <Icon
                    size={22}
                    strokeWidth={1.5}
                    className="text-gold transition-transform duration-600 ease-luxe group-hover:scale-110"
                  />
                </span>
                <h3 className="font-display text-xl font-medium text-cream">{title}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-cream/55">{desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
