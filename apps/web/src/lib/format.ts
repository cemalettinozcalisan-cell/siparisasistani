export const fmtPrice = (n: unknown) => Number(n || 0).toLocaleString('tr-TR');

export const fmtPriceTl = (n: unknown) => `${fmtPrice(n)} TL`;
