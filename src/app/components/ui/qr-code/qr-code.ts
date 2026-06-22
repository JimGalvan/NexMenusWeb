import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import QRCode from 'qrcode';

/** Error correction matches the legacy Django codes (segno error="M"). */
const ERROR_LEVEL = 'M' as const;
const QUIET_MARGIN = 2;

/**
 * Renders a real, scannable QR code from a URL. Presentational: the parent owns
 * the encoded value (the permanent `/r/<uuid>/` link) and asks for a high-res PNG
 * via {@link toPngDataUrl} when downloading or printing.
 */
@Component({
  selector: 'app-qr-code',
  imports: [],
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.css',
})
export class QrCodeComponent {
  /** URL to encode. */
  data = input.required<string>();
  /** On-screen pixel size of the rendered code. */
  size = input(168);

  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    effect(() => {
      const data = this.data();
      const size = this.size();
      const canvas = this.canvas();
      if (!canvas || !data) return;
      QRCode.toCanvas(canvas.nativeElement, data, {
        width: size,
        margin: QUIET_MARGIN,
        errorCorrectionLevel: ERROR_LEVEL,
      }).catch(() => {});
    });
  }

  /** High-resolution PNG data URL for download/print (defaults to 1024px). */
  toPngDataUrl(pixelSize = 1024): Promise<string> {
    return QRCode.toDataURL(this.data(), {
      width: pixelSize,
      margin: QUIET_MARGIN,
      errorCorrectionLevel: ERROR_LEVEL,
    });
  }
}

