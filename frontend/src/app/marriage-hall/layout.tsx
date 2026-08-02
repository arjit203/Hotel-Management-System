import { getTheHall } from "@/lib/hall";
import FloatingEnquiry from "@/modules/hall/components/FloatingEnquiry";

/**
 * Marriage Hall section shell.
 *
 * Exists purely to mount the persistent enquiry CTA across every hall page
 * without each page importing it. The venue's phone number is read once here
 * rather than threaded through eight pages.
 *
 * A Server Component: <FloatingEnquiry> is the only client boundary.
 */
export default async function MarriageHallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getTheHall();

  return (
    <>
      {children}
      {data && <FloatingEnquiry contactPhone={data.hall.contactPhone} />}
    </>
  );
}
