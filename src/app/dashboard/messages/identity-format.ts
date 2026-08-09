export type IdentityLike = {
  greeting?: string | null;
  signOff?: string | null;
  signatureName?: string | null;
  email?: string | null;
  phone?: string | null;
};

/** Builds a full email body from an identity: greeting, a blank line to type in, then the signature. */
export function buildIdentityBody(identity: IdentityLike, middle = ""): string {
  const greeting = identity.greeting?.trim() ?? "";
  const signature = [identity.signOff, identity.signatureName, identity.email, identity.phone]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .join("\n");

  return [greeting, "", middle.trim(), "", signature]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "\n");
}
