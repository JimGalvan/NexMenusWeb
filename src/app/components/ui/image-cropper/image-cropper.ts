import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input, output, signal } from '@angular/core';
import Cropper from 'cropperjs';

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

/**
 * Full-screen "Move & Scale" crop step shown after a file is picked, before
 * it's uploaded. Wraps Cropper.js in pan+zoom-only mode (fixed aspect ratio,
 * no freeform resize) and emits the final cropped image as a Blob.
 */
@Component({
  selector: 'app-image-cropper',
  imports: [],
  templateUrl: './image-cropper.html',
  styleUrl: './image-cropper.css',
})
export class ImageCropperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('img') private imgRef!: ElementRef<HTMLImageElement>;

  imageSrc = input.required<string>();
  aspectRatio = input(1);
  round = input(false);
  title = input('Move & Scale');
  outputType = input('image/jpeg');

  cropped = output<Blob>();
  dismiss = output<void>();

  private cropper: Cropper | null = null;
  readonly zoomMin = ZOOM_MIN;
  readonly zoomMax = ZOOM_MAX;
  zoomValue = signal(ZOOM_MIN);

  ngAfterViewInit(): void {
    this.cropper = new Cropper(this.imgRef.nativeElement, {
      aspectRatio: this.aspectRatio(),
      viewMode: 1,
      dragMode: 'move',
      cropBoxResizable: false,
      cropBoxMovable: false,
      toggleDragModeOnDblclick: false,
      background: false,
      autoCropArea: 1,
      zoom: event => this.zoomValue.set(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, event.detail.ratio))),
    });
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
    const canvas = this.cropper?.getCroppedCanvas();
    if (!canvas) return;
    canvas.toBlob(blob => { if (blob) this.cropped.emit(blob); }, this.outputType(), 0.92);
  }

  cancel(): void {
    this.dismiss.emit();
  }
}
