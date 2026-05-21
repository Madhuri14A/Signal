import test from 'node:test';
import assert from 'node:assert/strict';
import { cosineDistance, cosineSimilarity, dot, magnitude } from '../src/types/vectorMath';

test('dot product matches expected value', () => {
  assert.equal(dot([1, 2, 3], [4, 5, 6]), 32);
});

test('magnitude uses Euclidean norm', () => {
  assert.equal(magnitude([3, 4]), 5);
});

test('cosine similarity is 1 for identical vectors', () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test('cosine similarity is 0 for orthogonal vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('cosine distance equals 1 - similarity', () => {
  const similarity = cosineSimilarity([1, 1], [1, 0]);
  const distance = cosineDistance([1, 1], [1, 0]);
  assert.equal(distance, 1 - similarity);
});
