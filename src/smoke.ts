import { sampleDeviceFlow, sampleStudioState } from './fixtures/studio';
import { GitHubService } from './services/github';
import { StudioService } from './services/studio';
import type { DeviceFlowResponse } from './types';

export function installSmokeHooks(): void {
  const originalStart = GitHubService.startDeviceFlow.bind(GitHubService);
  const originalPoll = GitHubService.pollForToken.bind(GitHubService);
  let mocking = false;

  GitHubService.startDeviceFlow = async () => {
    try {
      const flow = await withTimeout(originalStart(), 8000);
      mocking = false;
      return flow;
    } catch {
      mocking = true;
      return sampleDeviceFlow;
    }
  };

  GitHubService.pollForToken = async (deviceCode: string) => {
    if (mocking) return { error: 'authorization_pending' };
    return originalPoll(deviceCode);
  };

  window.__casebook = {
    enterSampleStudio() {
      GitHubService.installSmokeSession();
      StudioService.holdSmokeState();
      StudioService.replaceState(sampleStudioState);
      window.dispatchEvent(new Event('casebook-smoke-enter'));
    },
  };
}

function withTimeout(work: Promise<DeviceFlowResponse>, ms: number): Promise<DeviceFlowResponse> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    work.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('device flow failed'));
      }
    );
  });
}
