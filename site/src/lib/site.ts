/** Public URLs follow the existing apex → www production redirect. */
export const SITE_URL = "https://www.tritimes.org";
export const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLScavYEE5U8S1Cx2OyLxFpDMPgNh5gcZh_VsbLawOBNkdYtNOQ/viewform";
export const SITE_DESCRIPTION = "TriTimes is an independent triathlon results viewer for IRONMAN and IRONMAN 70.3 races, with athlete histories, full-field time distributions, and swim, bike, run, and overall percentiles.";

// The operator chose not to publish a phone number or postal address.
// Add a direct email only once its mailbox or forwarding route is verified.
export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "TriTimes",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: FEEDBACK_URL,
  },
};
