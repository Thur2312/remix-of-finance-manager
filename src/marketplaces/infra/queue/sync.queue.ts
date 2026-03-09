import { MarketplaceSyncService } from '../../services/sync.service';

interface QueueJob {
  integrationId: string;
  scheduledAt: Date;
}

export class SyncQueue {
  private readonly queue: QueueJob[] = [];
  private isProcessing = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly syncService: MarketplaceSyncService,
    private readonly intervalMs: number = 60 * 60 * 1000,
  ) {}

  enqueue(integrationId: string): void {
    const alreadyQueued = this.queue.some((j) => j.integrationId === integrationId);
    if (!alreadyQueued) {
      this.queue.push({ integrationId, scheduledAt: new Date() });
    }
  }

  start(): void {
    this.intervalHandle = setInterval(async () => {
      await this.runScheduledSync();
    }, this.intervalMs);

    console.log(`[SyncQueue] Started with interval of ${this.intervalMs / 1000}s`);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runScheduledSync(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const results = await this.syncService.syncAllIntegrations();
      results.forEach((result) => {
        const status = result.errors.length === 0 ? 'OK' : 'PARTIAL';
        console.log(
          `[SyncQueue] ${result.marketplace}/${result.shopId} [${status}] ` +
          `orders=${result.ordersSynced} payments=${result.paymentsSynced}` +
          (result.errors.length ? ` errors=${result.errors.join(', ')}` : ''),
        );
      });
    } catch (error) {
      console.error('[SyncQueue] Sync failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        const result = await this.syncService.syncOrders(job.integrationId);
        console.log(
          `[SyncQueue] Processed ${job.integrationId}: ` +
          `orders=${result.ordersSynced} payments=${result.paymentsSynced}`,
        );
      } catch (error) {
        console.error(`[SyncQueue] Failed to process ${job.integrationId}:`, error);
      }
    }
  }
}
