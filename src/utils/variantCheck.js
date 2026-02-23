export const checkVariantExists = async ({
  productId,
  size,
  Type,
}) => {
  const existing = await Variant.findOne({
    productId,
    size,
    Type,
    disable: false,
  }).lean();

  return !!existing;
};