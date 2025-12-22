import slugify from 'slugify';


export const generateSlug = async (text, checkExists) => {
  if (!text) {
    throw new Error('Text is required to generate slug');
  }

  // Base slug
  let slug = slugify(text, {
    lower: true,
    strict: true,
    trim: true
  });

  // If no DB check required
  if (!checkExists) return slug;

  let uniqueSlug = slug;
  let counter = 1;

  // Ensure uniqueness
  while (await checkExists(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};