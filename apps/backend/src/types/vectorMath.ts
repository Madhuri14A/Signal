export function dot(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    throw new Error('Cosine similarity is undefined for zero vectors');
  }

  return dot(a, b) / (magA * magB);
}

export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}
