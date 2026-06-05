/** Run async work in fixed-size parallel batches to limit concurrency. */
export async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (batchSize < 1) {
    throw new RangeError('batchSize must be at least 1');
  }
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => fn(item, i + j)),
    );
    results.push(...batchResults);
  }
  return results;
}
