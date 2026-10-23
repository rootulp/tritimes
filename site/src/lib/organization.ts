/** Publish only verified contact information; a postal address is intentionally omitted. */
export function organizationJsonLd(email?: string) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("PUBLIC_CONTACT_EMAIL must be a working public email address");
  }
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://tritimes.org/#organization",
    name: "TriTimes",
    url: "https://tritimes.org",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: "https://docs.google.com/forms/d/e/1FAIpQLScavYEE5U8S1Cx2OyLxFpDMPgNh5gcZh_VsbLawOBNkdYtNOQ/viewform",
      ...(email ? { email } : {}),
    },
  };
}
