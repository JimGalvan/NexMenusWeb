import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuBuilderEvent, MenuBuilderService } from '../../services/menu-builder.service';

type ChatEntry =
  | { kind: 'message'; role: 'user' | 'assistant'; text: string }
  | { kind: 'card'; cardKind: 'preview' | 'claim'; url: string; label: string };

type Recovery = { message: string; retryMessage: string };

@Component({
  selector: 'app-menu-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.css',
})
export class MenuBuilderComponent {
  @ViewChild('thread') private thread?: ElementRef<HTMLElement>;

  private readonly service = inject(MenuBuilderService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  entries: ChatEntry[] = [];
  input = '';
  streaming = false;
  conversationId: string | null = null;
  recovery: Recovery | null = null;

  get canSend(): boolean {
    return !this.streaming && this.input.trim().length > 0;
  }

  submit(): void {
    const message = this.input.trim();
    if (!message || this.streaming || !isPlatformBrowser(this.platformId)) return;
    this.input = '';
    void this.send(message, true);
  }

  retry(): void {
    if (!this.recovery || this.streaming) return;
    void this.send(this.recovery.retryMessage, false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  reset(): void {
    this.entries = [];
    this.input = '';
    this.conversationId = null;
    this.recovery = null;
    this.refresh();
  }

  isExternal(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private async send(message: string, addUserMessage: boolean): Promise<void> {
    if (addUserMessage) this.entries.push({ kind: 'message', role: 'user', text: message });
    this.streaming = true;
    this.recovery = null;
    this.refresh();
    this.scrollToLatest();

    try {
      this.conversationId ||= await this.service.startConversation();
      await this.service.sendMessage(this.conversationId, message, event => this.receive(event));
    } catch (error) {
      const detail = error instanceof Error ? error.message : '';
      this.recovery = {
        message: detail === 'Load failed' || detail === 'Failed to fetch' || !detail
          ? 'Couldn’t send that message. Check your connection and try again.'
          : detail,
        retryMessage: message,
      };
    } finally {
      this.streaming = false;
      this.refresh();
      this.scrollToLatest();
    }
  }

  private receive(event: MenuBuilderEvent): void {
    if (event.type === 'assistant') {
      this.entries.push({ kind: 'message', role: 'assistant', text: event.data.text });
    } else if (event.type === 'card') {
      const existing = this.entries.find(
        entry => entry.kind === 'card' && entry.cardKind === event.data.kind,
      );
      if (existing?.kind === 'card') {
        existing.url = event.data.url;
        existing.label = event.data.label;
      } else {
        this.entries.push({
          kind: 'card', cardKind: event.data.kind, url: event.data.url, label: event.data.label,
        });
      }
    } else if (event.type === 'error') {
      this.recovery = { message: event.data.message, retryMessage: '' };
    }
    this.refresh();
    this.scrollToLatest();
  }

  private refresh(): void {
    this.changeDetector.markForCheck();
  }

  private scrollToLatest(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    requestAnimationFrame(() => {
      const element = this.thread?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }
}