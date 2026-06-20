import { Component, output } from '@angular/core';

/**
 * Mobile bottom sheet: dimmed backdrop + rounded card that slides up from the
 * bottom. Clicking the backdrop emits `dismiss`. Content is projected.
 */
@Component({
  selector: 'app-bottom-sheet',
  imports: [],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.css',
})
export class BottomSheetComponent {
  dismiss = output<void>();

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('sheet-backdrop')) {
      this.dismiss.emit();
    }
  }
}
