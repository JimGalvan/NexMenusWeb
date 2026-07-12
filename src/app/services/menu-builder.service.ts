import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type MenuBuilderEvent =
  | { type: 'assistant'; data: { text: string } }
  | { type: 'card'; data: { kind: 'preview' | 'claim'; url: string; label: string } }
  | { type: 'draft'; data: { version: number; readyToClaim: boolean } }
  | { type: 'error'; data: { code: string; message: string } }
  | { type: 'done'; data: Record<string, never> };

@Injectable({ providedIn: 'root' })
export class MenuBuilderService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.menuBuilderApiBaseUrl}/api/${environment.apiVersion}/menu-builder`;

  async startConversation(): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<{ conversationId: string }>(`${this.api}/conversations`, {}),
    );
    return response.conversationId;
  }

  async sendMessage(
    conversationId: string,
    message: string,
    onEvent: (event: MenuBuilderEvent) => void,
  ): Promise<void> {
    const response = await fetch(
      `${this.api}/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message }),
      },
    );

    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(problem?.message || 'The menu builder is unavailable right now.');
    }
    if (!response.body) throw new Error('The menu builder returned an empty response.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) this.parseFrame(frame, onEvent);
      if (done) break;
    }
    if (buffer.trim()) this.parseFrame(buffer, onEvent);
  }

  private parseFrame(frame: string, onEvent: (event: MenuBuilderEvent) => void): void {
    let type = '';
    const data: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (!type || data.length === 0) return;
    onEvent({ type, data: JSON.parse(data.join('\n')) } as MenuBuilderEvent);
  }
}
