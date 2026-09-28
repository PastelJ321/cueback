import type { AppData } from '../types/models';

// A single queue owns both the persisted snapshot and the visible snapshot.
// Failed writes leave both at the last successfully saved version.
export class AppDataStore {
  private current: AppData;
  private queue: Promise<void> = Promise.resolve();
  private readonly save: (data: AppData) => Promise<void>;
  private readonly publish: (data: AppData) => void;

  constructor(initial: AppData, save: (data: AppData) => Promise<void>, publish: (data: AppData) => void) {
    this.current = initial;
    this.save = save;
    this.publish = publish;
  }

  update<T>(change: (latest: AppData) => { next: AppData; result: T }): Promise<T> {
    const operation = this.queue.then(async () => {
      const { next, result } = change(this.current);
      await this.save(next);
      this.current = next;
      this.publish(next);
      return result;
    });
    this.queue = operation.then(() => undefined, () => undefined);
    return operation;
  }
}
