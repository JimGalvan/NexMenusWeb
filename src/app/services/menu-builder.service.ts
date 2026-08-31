import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export type MenuBuilderEvent =
  | { type: 'assistant'; data: { text: string } }
  | { type: 'card'; data: { kind: 'preview' | 'claim' | 'editor'; url: string; label: string } }
  | { type: 'draft'; data: { version: number; readyToClaim: boolean } }
  | { type: 'menu'; data: { menuId: string; version: number } }
  | { type: 'error'; data: { code: string; message: string } }
  | { type: 'done'; data: Record<string, never> };

export type AccountBuilderConversation = {
  id: string;
  title: string;
  status: 'ACTIVE' | 'COMPLETED';
  draftId?: string;
  menuId?: string;
  readyToClaim: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountBuilderConversationDetail = {
  conversation: AccountBuilderConversation;
  messages: { role: 'user' | 'assistant'; content: string; createdAt: string }[];
};

@Injectable({ providedIn: 'root' })
export class MenuBuilderService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.menuBuilderApiBaseUrl}/api/${environment.apiVersion}/menu-builder`;
  private readonly accountApi = `${environment.menuBuilderApiBaseUrl}/api/${environment.apiVersion}/account-menu-builder`;

  async startConversation(accountMode = false, menuId?: string | null): Promise<string> {
    const api = accountMode ? this.accountApi : this.api;
    const response = await firstValueFrom(
      this.http.post<{ conversationId: string }>(`${api}/conversations`,
        accountMode && menuId ? { menuId } : {}),
    );
    return response.conversationId;
  }

  async sendMessage(
    conversationId: string,
    message: string,
    onEvent: (event: MenuBuilderEvent) => void,
    accountMode = false,
  ): Promise<void> {
    const api = accountMode ? this.accountApi : this.api;
    const url = `${api}/conversations/${encodeURIComponent(conversationId)}/messages`;
    const request: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message }),
    };
    const response = accountMode
      ? await this.authenticatedFetch(url, request)
      : await fetch(url, request);

    if (!response.ok) {
      const problem = await response.json().catch(() => null) as { code?: string; message?: string } | null;
      const error = new Error(problem?.message || 'The menu builder is unavailable right now.') as Error & { code?: string };
      error.code = problem?.code;
      throw error;
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

  listAccountConversations() {
    return this.http.get<AccountBuilderConversation[]>(`${this.accountApi}/conversations`);
  }

  getAccountConversation(conversationId: string) {
    return this.http.get<AccountBuilderConversationDetail>(
      `${this.accountApi}/conversations/${encodeURIComponent(conversationId)}`,
    );
  }

  finalizeAccountConversation(conversationId: string) {
    return this.http.post<{ menuId: string; slug: string }>(
      `${this.accountApi}/conversations/${encodeURIComponent(conversationId)}/finalize`,
      {},
    );
  }

  private async authenticatedFetch(url: string, request: RequestInit): Promise<Response> {
    let token = this.auth.getToken();
    if (!token) token = await firstValueFrom(this.auth.refreshSession());
    let response = await fetch(url, this.withBearer(request, token));
    if (response.status === 401) {
      token = await firstValueFrom(this.auth.refreshSession());
      response = await fetch(url, this.withBearer(request, token));
    }
    return response;
  }

  private withBearer(request: RequestInit, token: string): RequestInit {
    return {
      ...request,
      headers: { ...(request.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    };
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
