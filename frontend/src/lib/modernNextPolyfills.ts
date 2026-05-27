const URLWithCanParse = URL as typeof URL & {
  canParse?: (url: string | URL, base?: string | URL) => boolean;
};

URLWithCanParse.canParse ??= (url, base) => {
  try {
    new URL(url, base);
    return true;
  } catch {
    return false;
  }
};

export {};
