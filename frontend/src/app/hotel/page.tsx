import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import StarRating from "@/components/StarRating";
import { getTheHotel } from "@/lib/hotel";
import FeaturedRooms from "@/modules/hotel/components/home/FeaturedRooms";
import AmenitiesPreview from "@/modules/hotel/components/home/AmenitiesPreview";
import OffersPreview from "@/modules/hotel/components/home/OffersPreview";
import GalleryPreview from "@/modules/hotel/components/home/GalleryPreview";
import Breadcrumbs from "@/components/Breadcrumbs";
import HotelSchema from "@/components/HotelSchema";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHotel();
  if (!data) return {};

  return {
    title: data.hotel.metaTitle || data.hotel.name,
    description: data.hotel.metaDescription || data.hotel.description.slice(0, 155),
    alternates: { canonical: "/hotel" },
  };
}

export default async function HotelPage() {
  const data = await getTheHotel();
  if (!data) return notFound();

  const { hotel, rooms, gallery, offers } = data;

  return (
    <main>
      <HotelSchema hotel={hotel} image={gallery[0]?.imageUrl} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: hotel.name }]} />
      <section className="bg-ink text-cream py-20 px-5 sm:px-8 text-center">
        <p className="section-eyebrow justify-center flex">7 Vachan Presents</p>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream">{hotel.name}</h1>
        <div className="flex justify-center mt-3">
          <StarRating rating={hotel.starRating} size={18} />
        </div>
        <p className="flex items-center justify-center gap-1.5 text-cream/60 mt-3 text-sm">
          <MapPin size={15} /> {hotel.address}
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-5 sm:px-8 py-16 text-center">
        <p className="text-ink/70 leading-relaxed text-lg">{hotel.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link href="/hotel/booking" className="btn-primary">
            Book Your Stay <ArrowRight size={16} />
          </Link>
          <Link href="/hotel/about" className="btn-outline">
            Our Story
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-ink/60">
          <a href={`tel:${hotel.contactPhone}`} className="flex items-center gap-1.5 hover:text-gold">
            <Phone size={15} /> {hotel.contactPhone}
          </a>
          <a href={`mailto:${hotel.contactEmail}`} className="flex items-center gap-1.5 hover:text-gold">
            <Mail size={15} /> {hotel.contactEmail}
          </a>
        </div>
      </section>

      <FeaturedRooms rooms={rooms} />
      <AmenitiesPreview amenities={hotel.amenities} />
      <OffersPreview offers={offers} />
      <GalleryPreview images={gallery} />
    </main>
  );
}
