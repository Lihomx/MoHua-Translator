// Screen WakeLock service to keep the mobile screen on during interpretation

class WakeLockService {
  private wakeLock: any = null;
  private isActive: boolean = false;

  async request(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.isActive = true;

        this.wakeLock.addEventListener('release', () => {
          this.isActive = false;
        });

        // Re-request lock if page becomes visible again
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        return true;
      } catch (err) {
        console.warn('WakeLock request failed or permission denied:', err);
        return false;
      }
    }
    return false;
  }

  private handleVisibilityChange = async () => {
    if (this.wakeLock !== null && document.visibilityState === 'visible') {
      await this.request();
    }
  };

  async release(): Promise<void> {
    if (this.wakeLock !== null) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
        this.isActive = false;
      } catch (err) {
        console.warn('WakeLock release error:', err);
      }
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  isLockActive(): boolean {
    return this.isActive;
  }
}

export const wakeLockService = new WakeLockService();
