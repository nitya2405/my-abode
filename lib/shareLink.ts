export function encodeParams(effectName: string, params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  searchParams.set('effect', effectName);
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value.toString());
  });
  return searchParams.toString();
}

export function decodeParams(queryString: string): { effectName: string | null; params: Record<string, any> } {
  const searchParams = new URLSearchParams(queryString);
  const effectName = searchParams.get('effect');
  const params: Record<string, any> = {};

  searchParams.forEach((value, key) => {
    if (key === 'effect') return;
    
    // Attempt to parse numbers and booleans
    if (value === 'true') params[key] = true;
    else if (value === 'false') params[key] = false;
    else if (!isNaN(Number(value)) && value.trim() !== '') params[key] = Number(value);
    else params[key] = value;
  });

  return { effectName, params };
}

export function getShareLink(effectName: string, params: Record<string, any>): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?${encodeParams(effectName, params)}`;
}
