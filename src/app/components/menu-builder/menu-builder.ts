import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuBuilderEvent, MenuBuilderService } from '../../services/menu-builder.service';
import { MenuBuilderSessionService } from '../../services/menu-builder-session.service';

type MenuLinks = { preview?: string; claim?: string };

type ChatEntry = { kind: 'message'; role: 'user' | 'assistant'; text: string; links?: MenuLinks };
type BuilderStep = 'business' | 'items' | 'preview';
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
  private readonly session = inject(MenuBuilderSessionService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  entries: ChatEntry[] = [];
  input = '';
  streaming = false;
  conversationId: string | null = null;
  recovery: Recovery | null = null;
  private menuLinks: MenuLinks = {};
  step: BuilderStep = 'business';
  resumeLabel: string | null = null;
  private sessionLabel: string | undefined;

  constructor() {
    const saved = this.session.load();
    if (saved && (saved.previewUrl || saved.claimUrl)) {
      this.conversationId = saved.conversationId;
      this.step = saved.step;
      this.menuLinks = { preview: saved.previewUrl, claim: saved.claimUrl };
      this.sessionLabel = saved.label;
      this.resumeLabel = saved.label ?? 'your menu';
    }
  }

  get resumeLinks(): MenuLinks {
    return this.menuLinks;
  }

  /** Escapes HTML, then renders the light **bold** markdown models emit. */
  format(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  get canSend(): boolean {
    return !this.streaming && this.input.trim().length > 0;
  }

  get sendLabel(): string {
    return this.entries.length ? 'Send' : 'Start creating';
  }

  get inputLabel(): string {
    if (this.step === 'business') return 'Tell us about your business';
    if (this.step === 'items') return 'Add menu items and prices';
    return 'Make a change to your menu';
  }

  get placeholder(): string {
    if (this.step === 'business') return 'TreeSoup, a Japanese restaurant in San Diego';
    if (this.step === 'items') return 'Miso Soup — $5, Shio Ramen — $14.50';
    return 'Add an item, change a price, or update a detail';
  }

  get helperText(): string {
    if (this.step === 'business') return 'Start with your business name, type, and city.';
    if (this.step === 'items') return 'List dishes and prices naturally — “Taco de Asada, $5” works.';
    return 'Your draft is ready. You can still make changes before publishing.';
  }

  submit(): void {
    const message = this.input.trim();
    if (!message || this.streaming || !isPlatformBrowser(this.platformId)) return;
    this.input = '';
    void this.send(message, true);
  }

  retry(): void {
    if (!this.recovery || this.streaming || !this.recovery.retryMessage) return;
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
    this.menuLinks = {};
    this.step = 'business';
    this.resumeLabel = null;
    this.sessionLabel = undefined;
    this.session.clear();
    this.refresh();
  }


  private async send(message: string, addUserMessage: boolean, isRetryAfterExpiry = false): Promise<void> {
    if (addUserMessage) this.entries.push({ kind: 'message', role: 'user', text: message });
    this.sessionLabel ||= message.slice(0, 60);
    this.resumeLabel = null;
    this.streaming = true;
    this.recovery = null;
    this.refresh();
    this.scrollToLatest();

    try {
      this.conversationId ||= await this.service.startConversation();
      this.saveSession();
      await this.service.sendMessage(this.conversationId, message, event => this.receive(event));
    } catch (error) {
      // The server conversation store is in-memory; if our stored id expired,
      // transparently continue in a fresh conversation (links stay intact).
      if ((error as Error & { code?: string })?.code === 'CONVERSATION_NOT_FOUND' && !isRetryAfterExpiry) {
        this.conversationId = null;
        this.streaming = false;
        return this.send(message, false, true);
      }
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
      this.entries.push({ kind: 'message', role: 'assistant', text: event.data.text, links: { ...this.menuLinks } });
    } else if (event.type === 'draft') {
      if (event.data.readyToClaim) this.step = 'preview';
      else if (this.step === 'business') this.step = 'items';
      this.saveSession();
    } else if (event.type === 'card') {
      this.menuLinks = { ...this.menuLinks, [event.data.kind]: event.data.url };
      for (const entry of this.entries) {
        if (entry.role === 'assistant') entry.links = { ...this.menuLinks };
      }
      this.saveSession();
    } else if (event.type === 'error') {
      this.recovery = { message: event.data.message, retryMessage: '' };
    }
    this.refresh();
    this.scrollToLatest();
  }

  private saveSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.session.save({
      conversationId: this.conversationId,
      previewUrl: this.menuLinks.preview,
      claimUrl: this.menuLinks.claim,
      label: this.sessionLabel,
      step: this.step,
    });
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