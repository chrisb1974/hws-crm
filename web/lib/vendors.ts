/**
 * Abreviations affichees dans le croquis du stack. Table fournie par le
 * cahier des charges ; tout code absent tombe sur ses trois premieres lettres.
 */
const ABBREVIATIONS: Record<string, string> = {
  hotelrunner: "HR",
  pluriel: "PL",
  siteminder: "SM",
  simple_booking: "SB",
  payzone: "PZ",
  centra: "CTR",
  channex: "CHX",
  octorate: "OCT",
  amenitiz: "AMZ",
  eviivo: "EVI",
  opera: "OPR",
  hotix: "HTX",
  lightresa: "LRS",
  arabsoft: "ARB",
  my_fidelio: "FID",
  hws: "HWS",
};

export function vendorAbbreviation(vendorCode: string | null | undefined): string {
  if (!vendorCode) return "";
  const known = ABBREVIATIONS[vendorCode];
  if (known) return known;
  return vendorCode.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();
}
