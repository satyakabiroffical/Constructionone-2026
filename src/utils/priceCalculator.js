export function calculateDiscount(mrp, discountPercent) {  // Sanvi 
  const mrpNum = Number(mrp || 0);
  const discountNum = Number(discountPercent || 0);

  if (mrpNum <= 0) {
    return {
      price: 0,
      discountAmount: 0,
    };
  }

  const discountAmount = (mrpNum * discountNum) / 100;
  const finalPrice = mrpNum - discountAmount;

  return {
    price: Math.round(finalPrice),
    discountAmount: Math.round(discountAmount),
  };
}