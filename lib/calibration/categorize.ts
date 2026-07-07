/**
 * Group a manufacturer-baseline material name into a display category, so the
 * calibration preset dropdown can show sectioned headers (Metal, Wood, …) like
 * the ComMarker reference sheet. Keyword rules, first match wins; order matters
 * (e.g. "Coated" is checked before "Metal" so a coated/painted metal lands under
 * Coated, while bare "Stainless Steel" lands under Metal).
 */
const RULES: [RegExp, string][] = [
  [/acrylic|plexi|pmma/i, "Acrylic"],
  [/coat|anodiz|tumbler|painted|powder ?coat|electroplat/i, "Coated / Anodized"],
  [/alumin|brass|stainless|steel|titanium|copper|\bmetal\b|\bgold\b|\bsilver\b|\bzinc\b|\bUSB\b/i, "Metal"],
  [/glass|ceramic|porcelain|tile/i, "Glass / Ceramic"],
  [/slate|stone|marble|granite|\brock\b/i, "Stone / Slate"],
  [/leather/i, "Leather"],
  [/silk|fabric|cotton|textile|canvas|felt|denim|linen|jean|towel|t-?shirt/i, "Fabric / Textile"],
  [/wood|plywood|bamboo|cork|walnut|basswood|pine|birch|\bMDF\b|veneer/i, "Wood"],
  [/paper|card ?stock|cardboard/i, "Paper / Card"],
  [/pc\/abs|pc plastic|\bABS\b|nylon|\bTPU\b|\bPET\b|\bPI\b|\bPVC\b|\bPP\b|\bPE\b|plastic|silicone|rubber|\bEVA\b|label|sticker|phone case/i, "Plastic / Rubber"],
  [/chocolate|biscuit|cookie|\begg\b|macaron|banana|apple|orange|bread|cake|candy|coffee|marshmallow|fruit|\bfood\b/i, "Food"],
];

/** The display order for category headers in the dropdown. */
export const CATEGORY_ORDER = [
  "Metal",
  "Coated / Anodized",
  "Glass / Ceramic",
  "Stone / Slate",
  "Acrylic",
  "Plastic / Rubber",
  "Wood",
  "Leather",
  "Fabric / Textile",
  "Paper / Card",
  "Food",
  "Other",
] as const;

export function materialCategory(name: string): string {
  for (const [re, cat] of RULES) if (re.test(name)) return cat;
  return "Other";
}
