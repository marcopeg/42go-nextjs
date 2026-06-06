const GENERIC_INVALID_EMAIL_MESSAGE = "Enter a valid email address.";

const CONSUMER_GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

const PRIVACY_RELAY_DOMAINS = new Set([
  "duck.com",
  "icloud.com",
  "me.com",
  "mozmail.com",
  "pm.me",
  "privaterelay.appleid.com",
  "proton.me",
  "protonmail.com",
  "simplelogin.com",
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "20minutemail.com",
  "33mail.com",
  "anonbox.net",
  "anonymbox.com",
  "bccto.me",
  "burnermail.io",
  "byom.de",
  "crazymailing.com",
  "deadaddress.com",
  "dispostable.com",
  "emailondeck.com",
  "emailtemporanea.com",
  "emailtemporanea.net",
  "emailtemporar.ro",
  "emailtemporario.com.br",
  "fakeinbox.com",
  "filzmail.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "harakirimail.com",
  "inboxkitten.com",
  "jetable.org",
  "mail-temp.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytrashmail.com",
  "no-spam.ws",
  "nospam.ze.tc",
  "nwytg.net",
  "sharklasers.com",
  "spam4.me",
  "spamavert.com",
  "spambog.com",
  "spamgourmet.com",
  "spamherelots.com",
  "spamhereplease.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempinbox.com",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trash-mail.com",
  "trashmail.com",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export type AuthEmailValidationResult =
  | {
      ok: true;
      email: string;
    }
  | {
      ok: false;
      message: string;
    };

const hasValidDomainLabels = (domain: string) => {
  const labels = domain.split(".");

  if (labels.length < 2) return false;

  return labels.every((label) => {
    if (!label || label.length > 63) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
    return /^[a-z0-9-]+$/.test(label);
  });
};

const isDisposableDomain = (domain: string) => {
  if (PRIVACY_RELAY_DOMAINS.has(domain)) return false;

  const labels = domain.split(".");
  for (let index = 0; index < labels.length - 1; index += 1) {
    const candidate = labels.slice(index).join(".");
    if (DISPOSABLE_EMAIL_DOMAINS.has(candidate)) return true;
  }

  return false;
};

export const validateAuthEmail = (input: string): AuthEmailValidationResult => {
  const email = input.trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    email.includes(",") ||
    email.includes(" ") ||
    email.includes("..")
  ) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  const [localPart, domain] = parts;
  if (
    !localPart ||
    !domain ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart) ||
    !hasValidDomainLabels(domain)
  ) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  const tld = domain.split(".").at(-1) || "";
  if (!/^[a-z]{2,63}$/.test(tld)) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  if (localPart.includes("+")) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  if (CONSUMER_GMAIL_DOMAINS.has(domain) && localPart.includes(".")) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  if (isDisposableDomain(domain)) {
    return { ok: false, message: GENERIC_INVALID_EMAIL_MESSAGE };
  }

  return { ok: true, email };
};

export const normalizeAuthEmail = (input: string) => {
  const result = validateAuthEmail(input);

  if (!result.ok) {
    throw new Error(GENERIC_INVALID_EMAIL_MESSAGE);
  }

  return result.email;
};

export const getGenericInvalidEmailMessage = () => GENERIC_INVALID_EMAIL_MESSAGE;
