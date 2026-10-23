import { ORGANIZATION } from "./site.ts";

/** Publish only verified contact information; a postal address is intentionally omitted. */
export function organizationJsonLd(email?: string) {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("PUBLIC_CONTACT_EMAIL must be a working public email address");
  }
  return {
    ...ORGANIZATION,
    contactPoint: {
      ...ORGANIZATION.contactPoint,
      ...(email ? { email } : {}),
    },
  };
}
