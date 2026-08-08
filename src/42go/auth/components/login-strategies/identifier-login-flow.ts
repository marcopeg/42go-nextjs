interface ShouldUsePasswordOptions {
  emailIsValid: boolean;
  hasCredentials: boolean;
  identifier: string;
}

export const shouldUsePasswordForIdentifier = ({
  emailIsValid,
  hasCredentials,
  identifier,
}: ShouldUsePasswordOptions) => {
  return hasCredentials && Boolean(identifier.trim()) && !emailIsValid;
};
