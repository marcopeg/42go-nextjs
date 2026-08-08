interface ShouldUsePasswordOptions {
  emailIsValid: boolean;
  hasCredentials: boolean;
  identifier: string;
}

interface IdentifierCancelTabIndexOptions {
  baseTabIndex: number;
  hasCredentials: boolean;
  step: 'identifier' | 'password' | 'code';
}

export const getIndexedTabIndex = (baseTabIndex: number, offset: number) => {
  return baseTabIndex > 0 ? baseTabIndex + offset : undefined;
};

export const getIdentifierCancelTabIndex = ({
  baseTabIndex,
  hasCredentials,
  step,
}: IdentifierCancelTabIndexOptions) => {
  const offset = step === 'identifier' && !hasCredentials ? 2 : 3;
  return getIndexedTabIndex(baseTabIndex, offset);
};

export const shouldUsePasswordForIdentifier = ({
  emailIsValid,
  hasCredentials,
  identifier,
}: ShouldUsePasswordOptions) => {
  return hasCredentials && Boolean(identifier.trim()) && !emailIsValid;
};
