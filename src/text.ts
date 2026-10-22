const STOPWORDS = new Set(
  "a an and are as at be by can do does for from how i if in is it its my of on or our the to was what when where which who why will with you your".split(
    " ",
  ),
);

/**
 * Lowercase word tokens without stopwords, with a naive stem (plural "s", then a 4-letter prefix so that
 * "encryption" and "encrypted" meet). Shared by retrieval and the offline model.
 */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => !STOPWORDS.has(word))
    .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word).slice(0, 4));
}
