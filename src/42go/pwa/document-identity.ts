export const shouldReloadPWAInstallDocument = ({
  currentHref,
  currentPathname,
  initialHref,
  initialPathname,
}: {
  currentHref: string;
  currentPathname: string;
  initialHref: string;
  initialPathname: string;
}) => currentPathname !== initialPathname && currentHref !== initialHref;
