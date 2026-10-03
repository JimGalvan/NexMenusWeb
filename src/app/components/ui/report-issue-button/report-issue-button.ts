import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { BottomSheetComponent } from '../bottom-sheet/bottom-sheet';

/**
 * "Report an issue" entry point for the signed-in app. Opens a sheet that says
 * plainly what happens next — an email to support, prefilled with the page,
 * account and browser so a report arrives with enough to act on — and offers
 * the address to copy for people without a mail app. Renders nothing when no
 * support email is configured, matching the other support links.
 */
@Component({
  selector: 'app-report-issue-button',
  imports: [BottomSheetComponent],
  templateUrl: './report-issue-button.html',
  styleUrl: './report-issue-button.css',
})
export class ReportIssueButtonComponent {
  private router = inject(Router);
  private auth = inject(AuthService);

  /** `chip` for compact headers, `nav` to sit with sidebar navigation links. */
  variant = input<'chip' | 'nav'>('chip');

  readonly supportEmail = environment.supportEmail.trim();
  readonly open = signal(false);
  readonly copied = signal(false);
  /** Captured when the sheet opens, so the report names the page it came from. */
  readonly href = signal('');

  private readonly accountEmail = computed(() => this.auth.account()?.email ?? '');

  show(): void {
    this.href.set(this.buildHref());
    this.copied.set(false);
    this.open.set(true);
  }

  copyAddress(): void {
    navigator.clipboard
      ?.writeText(this.supportEmail)
      .then(() => this.copied.set(true))
      .catch(() => {});
  }

  private buildHref(): string {
    const body = [
      'What happened?',
      '',
      '',
      'What did you expect to happen?',
      '',
      '',
      '---',
      `Page: ${this.router.url}`,
      `Account: ${this.accountEmail() || '(not signed in)'}`,
      `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
    ].join('\n');
    const subject = 'NexMenus issue report';
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
