let lock: Promise<void> = Promise.resolve();

export async function withWorkbookLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = lock;
  let release: () => void = () => {};
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}