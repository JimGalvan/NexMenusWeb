import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output, signal } from '@angular/core';
import Cropper from 'cropperjs';

// Zoom is expressed as a Cropper ratio (display px per natural px). The usable
// range is derived per-image on `ready`: fully contained (whole photo visible)
// at the low end, up to ZOOM_IN_FACTOR× the cover size at the high end.
const ZOOM_IN_FACTOR = 3;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Full-screen "Move & Scale" crop step shown after a file is picked, before
 * it's uploaded. Wraps Cropper.js in pan+zoom-only mode (fixed aspect ratio,
 * no freeform resize) and emits the final cropped image as a Blob.
 *
 * viewMode is 0 so the photo can be zoomed out past "cover" until it fits
 * entirely inside the frame — letterboxed against {@link padColor} — instead of
 * being forced to fill and lose its edges. Any frame area the photo doesn't
 * cover is filled with padColor in both the preview (stage background) and the
 * exported image, so the crop is WYSIWYG.
 */
@Component({
  selector: 'app-image-cropper',
  imports: [],
  templateUrl: './image-cropper.html',
  styleUrl: './image-cropper.css',
})
export class ImageCropperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stageWrap') private stageWrapRef!: ElementRef<HTMLDivElement>;
  @ViewChild('stage') private stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('img') private imgRef!: ElementRef<HTMLImageElement>;

  imageSrc = input.required<string>();
  aspectRatio = input(1);
  round = input(false);
  title = input('Move & Scale');
  outputType = input('image/jpeg');
  /** Fill for frame area the photo doesn't cover (letterbox bars, export bg). */
  padColor = input('#ffffff');

  cropped = output<Blob>();
  dismiss = output<void>();

  private cropper: Cropper | null = null;
  // Bounds start as sensible placeholders and are recomputed per-image on ready.
  zoomMin = signal(0.1);
  zoomMax = signal(ZOOM_IN_FACTOR);
  zoomValue = signal(1);

  ngAfterViewInit(): void {
    // Cropper.js needs a final, pixel-accurate container size *before* init —
    // sizing the stage via CSS aspect-ratio races its own layout measurement
    // and produces a misaligned/duplicated-looking crop view. Measuring the
    // rendered width and setting an explicit height up front avoids that.
    const stage = this.stageRef.nativeElement;
    const stageWrap = this.stageWrapRef.nativeElement;
    const ratio = this.aspectRatio();
    const availableWidth = Math.min(stageWrap.clientWidth, 960);
    const width = Math.min(availableWidth, stageWrap.clientHeight * ratio);
    stage.style.width = `${width}px`;
    stage.style.height = `${width / ratio}px`;

    this.cropper = new Cropper(this.imgRef.nativeElement, {
      aspectRatio: this.aspectRatio(),
      viewMode: 0,
      dragMode: 'move',
      cropBoxResizable: false,
      cropBoxMovable: false,
      toggleDragModeOnDblclick: false,
      background: false,
      autoCropArea: 1,
      ready: () => this.initZoomBounds(),
      zoom: event => this.zoomValue.set(clamp(event.detail.ratio, this.zoomMin(), this.zoomMax())),
    });
  }

  /**
   * Derive the zoom range from the natural image vs. the crop frame: the
   * "contain" ratio (whole photo visible) becomes the minimum so the user can
   * always zoom out far enough to avoid any cropping; "cover" × ZOOM_IN_FACTOR
   * is the maximum. Opens at cover so the default still fills the frame.
   */
  private initZoomBounds(): void {
    const cropper = this.cropper;
    if (!cropper) return;
    const img = cropper.getImageData();
    const box = cropper.getCropBoxData();
    const contain = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const cover = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight);
    this.zoomMin.set(contain);
    this.zoomMax.set(cover * ZOOM_IN_FACTOR);
    cropper.zoomTo(cover);
    this.zoomValue.set(cover);
  }

  ngOnDestroy(): void {
    this.cropper?.destroy();
  }

  onZoomInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.zoomValue.set(value);
    this.cropper?.zoomTo(value);
  }

  confirm(): void {
    // fillColor paints the letterbox area so JPEG (no alpha) doesn't render it
    // black; it matches the padColor shown behind the photo in the preview.
    const canvas = this.cropper?.getCroppedCanvas({ fillColor: this.padColor() });
    if (!canvas) return;
    canvas.toBlob(blob => { if (blob) this.cropped.emit(blob); }, this.outputType(), 0.92);
  }

  cancel(): void {
    this.dismiss.emit();
  }
}
