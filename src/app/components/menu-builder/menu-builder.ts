import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MenuBuilderEvent, MenuBuilderService } from '../../services/menu-builder.service';
import { MenuBuilderSessionService } from '../../services/menu-builder-session.service';

type MenuLinks = { preview?: string; claim?: string; editor?: string };

type ChatEntry = { kind: 'message'; role: 'user' | 'assistant'; text: string; links?: MenuLinks };
type BuilderStep = 'business' | 'items' | 'preview';
type Recovery = { message: string; retryMessage: string; allowStartOver: boolean };

@Component({
  selector: 'app-menu-builder',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.css',
})
export class MenuBuilderComponent implements OnInit, OnChanges {
  @ViewChild('thread') private thread?: ElementRef<HTMLElement>;

  @Input() embedded = false;
  @Input() accountMode = false;
  @Input() accountConversationId: string | null = null;
  @Input() accountTargetMenuId: string | null = null;
  @Input() accountTargetMenuName: string | null = null;
  @Input() title = 'Build your menu with AI';
  @Input() subtitle = 'Turn your dish list into an organized restaurant menu with AI-written descriptions. Review every detail, then publish a mobile menu, QR code, and printable PDF.';

  @Output() previewUrlChange = new EventEmitter<string | null>();
  @Output() draftVersionChange = new EventEmitter<number>();
  @Output() stepChange = new EventEmitter<BuilderStep>();
  @Output() accountActivity = new EventEmitter<void>();
  @Output() menuCreated = new EventEmitter<string>();

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
  readyToSave = false;
  saving = false;

  constructor() {}

  ngOnInit(): void {
    if (!this.accountMode) this.restoreAnonymousSession();
    this.previewUrlChange.emit(this.menuLinks.preview ?? null);
    this.stepChange.emit(this.step);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.accountMode && changes['accountConversationId'] && this.accountConversationId) {
      void this.loadAccountConversation(this.accountConversationId);
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
    if (this.editsExistingMenu && !this.entries.length) return 'Make change';
    return this.entries.length ? 'Send' : 'Start creating';
  }

  get editsExistingMenu(): boolean {
    return this.accountMode && !!this.accountTargetMenuId;
  }

  get inputLabel(): string {
    if (this.editsExistingMenu) return `What should change${this.accountTargetMenuName ? ` on ${this.accountTargetMenuName}` : ''}?`;
    if (this.step === 'business') return 'Tell us about your business';
    if (this.step === 'items') return 'Add menu items and prices';
    return 'Make a change to your menu';
  }

  get placeholder(): string {
    if (this.editsExistingMenu) return 'Change the brisket to $24, or add lemonade for $4';
    if (this.step === 'business') return 'TreeSoup, a Japanese restaurant in San Diego';
    if (this.step === 'items') return 'Miso Soup — $5, Shio Ramen — $14.50';
    return 'Add an item, change a price, or update a detail';
  }

  get helperText(): string {
    if (this.editsExistingMenu) return 'Requested changes are applied to this menu immediately.';
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
    this.readyToSave = false;
    this.saving = false;
    if (!this.accountMode) this.session.clear();
    this.previewUrlChange.emit(null);
    this.stepChange.emit(this.step);
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
      if (!this.conversationId) {
        this.conversationId = await this.service.startConversation(this.accountMode, this.accountTargetMenuId);
        if (this.accountMode) this.accountActivity.emit();
      }
      this.saveSession();
      await this.service.sendMessage(
        this.conversationId,
        message,
        event => this.receive(event, message),
        this.accountMode,
      );
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
        allowStartOver: true,
      };
    } finally {
      this.streaming = false;
      this.refresh();
      this.scrollToLatest();
    }
  }

  private receive(event: MenuBuilderEvent, sentMessage: string): void {
    if (event.type === 'assistant') {
      this.entries.push({ kind: 'message', role: 'assistant', text: event.data.text, links: { ...this.menuLinks } });
    } else if (event.type === 'draft') {
      this.readyToSave = event.data.readyToClaim;
      if (event.data.readyToClaim) this.step = 'preview';
      else if (this.step === 'business') this.step = 'items';
      this.draftVersionChange.emit(event.data.version);
      this.stepChange.emit(this.step);
      this.saveSession();
    } else if (event.type === 'menu') {
      this.draftVersionChange.emit(event.data.version);
      this.accountActivity.emit();
    } else if (event.type === 'card') {
      this.menuLinks = { ...this.menuLinks, [event.data.kind]: event.data.url };
      if (event.data.kind === 'preview') this.previewUrlChange.emit(event.data.url);
      for (const entry of this.entries) {
        if (entry.role === 'assistant') entry.links = { ...this.menuLinks };
      }
      this.saveSession();
    } else if (event.type === 'error') {
      // The agent is busy / hit a transient error — offer to resend the same
      // message rather than a full reset (Start over stays available below).
      this.recovery = { message: event.data.message, retryMessage: sentMessage, allowStartOver: false };
    } else if (event.type === 'done' && this.accountMode) {
      this.accountActivity.emit();
    }
    this.refresh();
    this.scrollToLatest();
  }

  private saveSession(): void {
    if (this.accountMode || !isPlatformBrowser(this.platformId)) return;
    this.session.save({
      conversationId: this.conversationId,
      previewUrl: this.menuLinks.preview,
      claimUrl: this.menuLinks.claim,
      label: this.sessionLabel,
      step: this.step,
    });
  }

  saveToMenus(): void {
    if (!this.accountMode || !this.conversationId || !this.readyToSave || this.saving) return;
    this.saving = true;
    this.recovery = null;
    this.service.finalizeAccountConversation(this.conversationId).subscribe({
      next: result => {
        this.saving = false;
        this.accountActivity.emit();
        this.menuCreated.emit(result.menuId);
      },
      error: (error: { error?: { message?: string } }) => {
        this.saving = false;
        this.recovery = {
          message: error.error?.message || 'Could not save this menu. Review the draft and try again.',
          retryMessage: '',
          allowStartOver: false,
        };
        this.refresh();
      },
    });
  }

  private restoreAnonymousSession(): void {
    const saved = this.session.load();
    if (!saved || (!saved.previewUrl && !saved.claimUrl)) return;
    this.conversationId = saved.conversationId;
    this.step = saved.step;
    this.menuLinks = { preview: saved.previewUrl, claim: saved.claimUrl };
    this.sessionLabel = saved.label;
    this.resumeLabel = saved.label ?? 'your menu';
  }

  private async loadAccountConversation(id: string): Promise<void> {
    try {
      const detail = await firstValueFrom(this.service.getAccountConversation(id));
      this.conversationId = detail.conversation.id;
      this.entries = detail.messages.map(message => ({
        kind: 'message' as const,
        role: message.role,
        text: message.content,
      }));
      this.readyToSave = !this.editsExistingMenu && detail.conversation.readyToClaim;
      this.step = this.editsExistingMenu ? 'preview' : this.readyToSave ? 'preview' : this.entries.length ? 'items' : 'business';
      this.stepChange.emit(this.step);
      this.recovery = null;
      this.refresh();
      this.scrollToLatest();
    } catch {
      this.recovery = {
        message: 'Could not load that conversation. Start a new chat or try again.',
        retryMessage: '',
        allowStartOver: true,
      };
      this.refresh();
    }
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
