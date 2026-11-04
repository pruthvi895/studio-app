import { applyMappedState, mapStateFile, STUDIO_FILES } from '../lib/stateMap';
import { listActivity } from '../lib/reviewQueue';
import { GitHubService } from './github';
import type { StudioCommand, StudioState } from '../types';

export interface RefreshResult {
  errors: string[];
}

export class StudioService {
  private static state: StudioState = {};
  private static listeners: Set<() => void> = new Set();
  private static generation = 0;
  private static inflight: { generation: number; promise: Promise<RefreshResult> } | null = null;
  private static smokeHold = false;

  static subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify(): void {
    for (const listener of this.listeners) listener();
  }

  static getState(): StudioState {
    return this.state;
  }

  static clear(): void {
    this.generation += 1;
    this.inflight = null;
    this.smokeHold = false;
    this.state = {};
    this.notify();
  }

  static resetForTests(): void {
    this.state = {};
    this.listeners.clear();
    this.inflight = null;
    this.generation = 0;
    this.smokeHold = false;
  }

  static holdSmokeState(): void {
    if (import.meta.env.VITE_SMOKE !== 'true') return;
    this.smokeHold = true;
  }

  static replaceState(next: StudioState): void {
    if (import.meta.env.VITE_SMOKE !== 'true') return;
    this.generation += 1;
    this.inflight = null;
    this.state = next;
    this.notify();
  }

  static async refresh(): Promise<RefreshResult> {
    if (this.smokeHold) return { errors: [] };
    if (!GitHubService.isAuthenticated()) return { errors: [] };
    const generation = this.generation;
    if (this.inflight?.generation === generation) return this.inflight.promise;
    const promise = this.load(generation).finally(() => {
      if (this.inflight?.promise === promise) this.inflight = null;
    });
    this.inflight = { generation, promise };
    return promise;
  }

  private static async load(generation: number): Promise<RefreshResult> {
    const results = await Promise.allSettled(
      STUDIO_FILES.map(async (file) => {
        const data = await GitHubService.fetchFile(file);
        return { file, data };
      })
    );

    if (generation !== this.generation) return { errors: [] };

    let next = this.state;
    let changed = false;
    const errors: string[] = [];

    for (const result of results) {
      if (generation !== this.generation) return { errors: [] };
      if (result.status === 'rejected') {
        errors.push(result.reason instanceof Error ? result.reason.message : 'Failed to refresh');
        continue;
      }
      const { file, data } = result.value;
      if (data == null) continue;
      const mapped = mapStateFile(file, data);
      if (!mapped) {
        errors.push(`Could not read ${file}`);
        continue;
      }
      if (JSON.stringify(next[mapped.key]) !== JSON.stringify(mapped.value)) {
        next = applyMappedState(next, mapped);
        changed = true;
      }
    }

    if (generation !== this.generation) return { errors: [] };
    if (changed) {
      this.state = next;
      this.notify();
    }

    return { errors };
  }

  static async sendCommand(command: StudioCommand): Promise<void> {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const cmd = { ...command, id, status: 'pending' };
    await GitHubService.writeFile(`cmds/inbox/${id}.json`, cmd, `app: ${command.type}`);
    await this.refresh();
  }

  static getVideos() {
    return this.state.youtube?.videos ?? [];
  }

  static getQA() {
    return this.state.qa ?? {};
  }

  static getSchedule() {
    return this.state.schedule?.pairs ?? [];
  }

  static getInstagramItems() {
    return this.state.ig?.items ?? [];
  }

  static getRenderState() {
    return this.state.render;
  }

  static getLaptopJobs() {
    return this.state.laptop_jobs ?? {};
  }

  static getLaptopQueue() {
    return this.state.laptop_queue ?? [];
  }

  static getResults() {
    return listActivity(this.state.results);
  }

  static getHeartbeat() {
    return this.state.heartbeat;
  }
}
