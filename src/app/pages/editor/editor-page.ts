import {
  AfterViewInit,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import flatpickr from 'flatpickr';
import { Instance } from 'flatpickr/dist/types/instance';
import Sortable from 'sortablejs';
import * as FilePond from 'filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import { MenuService } from '../../services/menu.service';
import { AuthService } from '../../services/auth.service';
import {
  ContactMethod,
  MENU_CONTACT_METHOD_PROPERTY,
  MENU_CUISINES_PROPERTY,
  MENU_FAQS_PROPERTY,
  MENU_HIGHLIGHTS_PROPERTY,
  MENU_SOCIAL_LINKS_PROPERTY,
  Menu,
  MenuFaq,
  contactMethodFrom,
  coverUrlFrom,
  cuisinesFrom,
  faqsFrom,
  highlightsFrom,
  instagramHandleFrom,
} from '../../models/menu.model';
import { BottomSheetComponent } from '../../components/ui/bottom-sheet/bottom-sheet';
import { ImageCropperComponent } from '../../components/ui/image-cropper/image-cropper';

type Status = 'available' | 'sold' | 'hidden';
type Screen = 'overview' | 'details' | 'managecats' | 'edit';
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type HoursTimeField = 'openTime' | 'closeTime';

interface EditorItem {
  id: string;
  cat: string;
  name: string;
  price: string;
  desc: string;
  status: Status;
  photoUrl: string;
  /** A freshly picked file, uploaded after the item is saved. */
  photoFile?: File;
}

interface EditorHoursRow {
  key: DayKey;
  day: string;
  shortDay: string;
  closed: boolean;
  openTime: string;
  closeTime: string;
}

interface EditorHoursSummaryRow {
  dayLabel: string;
  timeLabel: string;
  closed: boolean;
}

const ACCENTS = ['#22224b', '#0E7490', '#15803D', '#C2410C', '#BE123C', '#7C3AED'];
// Mirrors the API's ImageValidator limits for an instant client-side rejection.
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LOGO_MAX_BYTES = 5 * 1024 * 1024;
const LOGO_MAX_SIZE_LABEL = '5MB';
const ITEM_PHOTO_ASPECT = 16 / 9;
const COVER_PHOTO_ASPECT = 16 / 7;
type CropTarget = 'logo' | 'cover' | 'item';
const DEFAULT_HOURS: EditorHoursRow[] = [
  { key: 'mon', day: 'Monday', shortDay: 'Mon', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'tue', day: 'Tuesday', shortDay: 'Tue', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'wed', day: 'Wednesday', shortDay: 'Wed', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'thu', day: 'Thursday', shortDay: 'Thu', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'fri', day: 'Friday', shortDay: 'Fri', closed: false, openTime: '09:00', closeTime: '22:00' },
  { key: 'sat', day: 'Saturday', shortDay: 'Sat', closed: false, openTime: '10:00', closeTime: '23:00' },
  { key: 'sun', day: 'Sunday', shortDay: 'Sun', closed: true, openTime: '09:00', closeTime: '22:00' },
];
const CAT_GRADIENTS: Record<string, string> = {
  Starters: 'linear-gradient(135deg,#e2ecd9,#c7d9ba)',
  'From the Sea': 'linear-gradient(135deg,#d6e7f0,#b6d2e2)',
  Mains: 'linear-gradient(135deg,#eedfcc,#dbc1a5)',
  Desserts: 'linear-gradient(135deg,#eedce5,#ddc2d0)',
  Drinks: 'linear-gradient(135deg,#dfe3ee,#c2c9dd)',
};
const GRAD_PALETTE = [
  'linear-gradient(135deg,#e7e0f0,#cfc2e2)',
  'linear-gradient(135deg,#dfeee0,#bfe0c5)',
  'linear-gradient(135deg,#f0e6da,#e2cdb0)',
  'linear-gradient(135deg,#dce8ee,#bdd5e2)',
  'linear-gradient(135deg,#f0dfe4,#e2c2cf)',
  'linear-gradient(135deg,#e9e3da,#d3c7b6)',
];

@Directive({
  selector: 'input[appTimePicker]',
})
export class TimePickerDirective implements AfterViewInit, OnChanges, OnDestroy {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private picker: Instance | null = null;

  @Input() value = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  ngAfterViewInit(): void {
    this.picker = flatpickr(this.el.nativeElement, {
      allowInput: true,
      dateFormat: 'H:i',
      defaultDate: this.value || undefined,
      disableMobile: true,
      enableTime: true,
      minuteIncrement: 15,
      noCalendar: true,
      onChange: (_selectedDates, dateStr) => this.valueChange.emit(dateStr),
      onClose: (_selectedDates, dateStr) => this.valueChange.emit(dateStr),
      time_24hr: false,
    });
    this.syncPicker();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['disabled']) this.syncPicker();
  }

  ngOnDestroy(): void {
    this.picker?.destroy();
  }

  private syncPicker(): void {
    this.el.nativeElement.disabled = this.disabled;
    if (!this.picker) return;
    if (this.value && this.picker.input.value !== this.value) {
      this.picker.setDate(this.value, false, 'H:i');
    }
    this.picker.input.disabled = this.disabled;
  }
}

@Directive({
  selector: '[appSortable]',
})
export class SortableDirective implements AfterViewInit, OnChanges, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private sortable: Sortable | null = null;

  @Input() appSortable: readonly string[] = [];
  @Input() sortableDisabled = false;
  @Input() sortableHandle = '.ed-row__grip';
  @Output() sortableOrderChange = new EventEmitter<string[]>();

  ngAfterViewInit(): void {
    this.sortable = new Sortable(this.el.nativeElement, {
      animation: 150,
      chosenClass: 'is-sortable-chosen',
      dragClass: 'is-sortable-drag',
      disabled: this.sortableDisabled,
      ghostClass: 'is-sortable-ghost',
      handle: this.sortableHandle,
      onEnd: () => this.emitOrder(),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sortableDisabled']) {
      this.sortable?.option('disabled', this.sortableDisabled);
    }
  }

  ngOnDestroy(): void {
    this.sortable?.destroy();
  }

  private emitOrder(): void {
    const ids = Array.from(this.el.nativeElement.children)
      .map(child => (child as HTMLElement).dataset['sortableId'])
      .filter((id): id is string => !!id);
    if (ids.length) this.sortableOrderChange.emit(ids);
  }
}


let filePondPluginsRegistered = false;

/**
 * Mounts FilePond on a hidden file input purely for its drag/drop + type/size
 * validation; its own UI is kept off-screen (`.fp-headless`) since the page's
 * own button is the visible trigger. Picked files are handed off immediately
 * via `picked` and the pond is cleared, so it never renders a file list.
 */
@Directive({
  selector: 'input[appFilePondPick]',
  exportAs: 'filePondPick',
})
export class FilePondPickDirective implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private pond: FilePond.FilePond | null = null;

  @Input() acceptedFileTypes: string[] = [];
  @Input() maxFileSize = '5MB';
  @Output() picked = new EventEmitter<File>();
  @Output() rejected = new EventEmitter<string>();

  ngAfterViewInit(): void {
    if (!filePondPluginsRegistered) {
      FilePond.registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);
      filePondPluginsRegistered = true;
    }
    this.pond = FilePond.create(this.el.nativeElement, {
      allowMultiple: false,
      instantUpload: false,
      acceptedFileTypes: this.acceptedFileTypes,
      maxFileSize: this.maxFileSize,
      credits: false,
      className: 'fp-headless',
    }) as FilePond.FilePond;
    this.pond.on('addfile', (error, item) => {
      if (error) {
        this.rejected.emit(error.main ?? 'File rejected');
        return;
      }
      this.picked.emit(item.file as File);
      this.pond?.removeFile(item.id);
    });
  }

  browse(): void {
    this.pond?.browse();
  }

  ngOnDestroy(): void {
    if (this.pond) FilePond.destroy(this.el.nativeElement);
  }
}

/**
 * Menu editor. Loads the menu via `MenuService.getMenu` and persists every edit
 * through the matching contract endpoint (`addItem`, `updateItem`,
 * `addCategory`, …), reloading from the store after each mutation so the local
 * working state stays in lockstep with the backend.
 */
@Component({
  selector: 'app-editor-page',
  imports: [FormsModule, RouterLink, BottomSheetComponent, TimePickerDirective, FilePondPickDirective, SortableDirective, ImageCropperComponent],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.css',
})
export class EditorPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private menuService = inject(MenuService);
  private auth = inject(AuthService);

  /** The owner's account email — what diners see when "show email" is on. */
  readonly ownerEmail = computed(() => this.auth.account()?.email ?? '');

  readonly accents = ACCENTS;

  private menuId = this.route.snapshot.paramMap.get('id')!;
  private gradients: Record<string, string> = { ...CAT_GRADIENTS };

  /** Authoritative menu from the backend; used to resolve category ids. */
  private menuModel = signal<Menu | null>(null);

  // ---- working state ----
  menuName = signal('');
  description = signal('');
  phone = signal('');
  contactMethod = signal<ContactMethod>('text');
  address = signal('');
  instagramHandle = signal('');
  showEmail = signal(false);
  accent = signal(this.menuService.accent());
  logoUrl = signal('');
  logoUploading = signal(false);
  coverUrl = signal('');
  coverUploading = signal(false);
  cuisines = signal<string[]>([]);
  highlights = signal<string[]>([]);
  faqs = signal<MenuFaq[]>([]);
  cats = signal<string[]>([]);
  items = signal<EditorItem[]>([]);
  notFound = signal(false);

  screen = signal<Screen>('overview');
  activeCat = signal('All');
  draft = signal<EditorItem | null>(null);
  sheetId = signal<string | null>(null);
  addCatOpen = signal(false);
  addCatFrom = signal<'items' | 'form'>('items');
  newCatName = signal('');
  renamingIdx = signal(-1);
  catDraftName = signal('');
  toast = signal('');

  // ---- crop step (between file pick and upload) ----
  cropSrc = signal<string | null>(null);
  cropAspect = signal(1);
  cropRound = signal(false);
  cropTitle = signal('Edit photo');
  private cropTarget: CropTarget | null = null;
  private pendingFile: File | null = null;
  readonly logoAcceptedTypes = LOGO_TYPES;
  readonly logoMaxFileSize = LOGO_MAX_SIZE_LABEL;
  readonly photoAcceptedTypes = LOGO_TYPES;
  readonly photoMaxFileSize = LOGO_MAX_SIZE_LABEL;
  readonly cuisineOptions = ['California', 'Seafood', 'Farm-to-table', 'Bakery', 'Mexican', 'Italian', 'Coffee shop', 'Pizza'];
  readonly highlightOptions = ['Family friendly', 'Local pickup', 'Delivery', 'Outdoor seating', 'Vegetarian options'];

  hoursRows = signal<EditorHoursRow[]>(cloneHours(DEFAULT_HOURS));
  hoursSheetOpen = signal(false);
  private hoursTouched = signal(false);

  // ---- derived ----
  readonly catChips = computed(() => ['All', ...this.cats()]);
  readonly filteredItems = computed(() => {
    const cat = this.activeCat();
    return cat === 'All' ? this.items() : this.items().filter(i => i.cat === cat);
  });
  readonly filteredItemIds = computed(() => this.filteredItems().map(i => i.id));
  readonly canReorderItems = computed(() => this.activeCat() !== 'All' && this.filteredItems().length > 1);
  readonly canReorderCategories = computed(() => this.renamingIdx() === -1 && this.cats().length > 1);
  readonly emptyCatLabel = computed(() => (this.activeCat() === 'All' ? 'your menu' : this.activeCat()));
  readonly sheetItem = computed(() => this.items().find(i => i.id === this.sheetId()) ?? null);
  readonly editTitle = computed(() => (this.draft()?.id && this.itemExists(this.draft()!.id) ? 'Edit item' : 'New item'));
  readonly operatingHoursText = computed(() => formatOperatingHours(this.hoursRows()));
  readonly hoursSummaryRows = computed(() => summarizeHours(this.hoursRows()));


  constructor() {
    this.menuService.getMenu(this.menuId).subscribe({
      next: menu => this.hydrate(menu),
      error: () => this.notFound.set(true),
    });
  }

  /** Re-fetch and re-hydrate after a mutation (transient UI signals are kept). */
  private reload() {
    this.menuService.getMenu(this.menuId).subscribe(menu => this.hydrate(menu));
  }

  private hydrate(menu: Menu) {
    this.menuModel.set(menu);
    this.menuName.set(menu.name);
    this.description.set(menu.description ?? '');
    this.phone.set(menu.phone ?? '');
    this.contactMethod.set(contactMethodFrom(menu.properties));
    this.address.set(menu.address ?? '');
    this.instagramHandle.set(instagramHandleFrom(menu.properties));
    this.showEmail.set(menu.showEmail ?? false);
    this.logoUrl.set(menu.logoUrl ?? '');
    this.coverUrl.set(coverUrlFrom(menu.properties) ?? '');
    this.cuisines.set(cuisinesFrom(menu.properties));
    this.highlights.set(highlightsFrom(menu.properties));
    this.faqs.set(faqsFrom(menu.properties));
    const parsedHours = menu.operatingHours ? parseOperatingHours(menu.operatingHours) : null;
    if (parsedHours) this.hoursRows.set(parsedHours);

    const cats = [...menu.categories].sort((a, b) => a.position - b.position);
    this.cats.set(cats.map(c => c.name));
    cats.forEach((c, i) => {
      if (!this.gradients[c.name]) this.gradients[c.name] = GRAD_PALETTE[i % GRAD_PALETTE.length];
    });

    const nameById = new Map(menu.categories.map(c => [c.id, c.name]));
    const catRank = new Map(cats.map((c, i) => [c.id, i]));
    const flat: EditorItem[] = [...menu.items]
      .sort(
        (a, b) =>
          (catRank.get(a.categoryId ?? '') ?? 99) - (catRank.get(b.categoryId ?? '') ?? 99) ||
          a.position - b.position,
      )
      .map(it => ({
        id: it.id,
        cat: it.categoryId ? nameById.get(it.categoryId) ?? '' : '',
        name: it.name,
        price: it.priceAmount,
        desc: it.description ?? '',
        status: !it.visible ? 'hidden' : it.soldOut ? 'sold' : 'available',
        photoUrl: it.imageUrl ?? '',
      }));
    this.items.set(flat);
  }

  private catIdByName(name: string): string | null {
    return this.menuModel()?.categories.find(c => c.name === name)?.id ?? null;
  }

  // ---- visuals ----
  initials(): string {
    return this.menuName().trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'NM';
  }
  gradientFor(cat: string): string {
    return this.gradients[cat] ?? '#eee';
  }
  thumb(item: EditorItem): string {
    return item.photoUrl
      ? `url("${item.photoUrl}") center/cover no-repeat, ${this.gradientFor(item.cat)}`
      : this.gradientFor(item.cat);
  }
  tint(): string {
    const h = this.accent().replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.1)`;
  }
  badge(status: Status): { label: string; cls: string } | null {
    if (status === 'sold') return { label: 'Sold out', cls: 'badge--sold' };
    if (status === 'hidden') return { label: 'Hidden', cls: 'badge--hidden' };
    return null;
  }
  catCount(cat: string): string {
    const n = this.items().filter(i => i.cat === cat).length;
    return `${n} ${n === 1 ? 'item' : 'items'}`;
  }

  // ---- navigation ----
  exit() {
    this.persistDetails();
    this.router.navigate(['/app/menus']);
  }
  showItems() { this.persistDetails(); this.screen.set('overview'); }
  showDetails() { this.screen.set('details'); }
  /** Preview = the real diner page. Persist details first so it reflects the latest. */
  openPreview() {
    const slug = this.menuModel()?.slug;
    if (!slug) return;
    this.persistDetails(() => this.router.navigate(['/m', slug]));
  }
  /** Printable version of the same diner page; persist details first too. */
  openPrintable() {
    const slug = this.menuModel()?.slug;
    if (!slug) return;
    this.persistDetails(() => this.router.navigate(['/m', slug, 'print']));
  }

  // ---- items ----
  itemExists(id: string) { return this.items().some(i => i.id === id); }

  startAdd() {
    const cat = this.activeCat() !== 'All' ? this.activeCat() : this.cats()[0] ?? '';
    this.draft.set({ id: crypto.randomUUID(), cat, name: '', price: '', desc: '', status: 'available', photoUrl: '' });
    this.sheetId.set(null);
    this.screen.set('edit');
  }
  startEdit(id: string) {
    const it = this.items().find(i => i.id === id);
    if (!it) return;
    this.draft.set({ ...it });
    this.sheetId.set(null);
    this.screen.set('edit');
  }
  updateDraft<K extends keyof EditorItem>(field: K, value: EditorItem[K]) {
    const d = this.draft();
    if (d) this.draft.set({ ...d, [field]: value });
  }
  onPriceInput(value: string) {
    this.updateDraft('price', value.replace(/[^0-9.]/g, '') as EditorItem['price']);
  }
  saveDraft() {
    const d = this.draft();
    if (!d) return;
    const name = d.name.trim() || 'New item';
    const priceAmount = d.price || '0';
    const categoryId = this.catIdByName(d.cat);
    const description = d.desc.trim() || null;
    const visible = d.status !== 'hidden';
    const soldOut = d.status === 'sold';
    const exists = this.itemExists(d.id);

    const done = (savedId: string) => {
      if (d.photoFile) {
        this.menuService.uploadItemImage(this.menuId, savedId, d.photoFile).subscribe({
          next: () => this.reload(),
          error: () => this.reload(),
        });
      } else {
        this.reload();
      }
    };

    const request$ = exists
      ? this.menuService.updateItem(this.menuId, d.id, { categoryId, name, description, priceAmount, visible, soldOut })
      : this.menuService.addItem(this.menuId, { categoryId, name, description, priceAmount, visible, soldOut });
    request$.subscribe({ next: item => done(item.id), error: () => this.flash('Could not save item') });

    this.activeCat.set(d.cat || 'All');
    this.draft.set(null);
    this.screen.set('overview');
    this.flash('Saved to your menu');
  }
  cancelEdit() { this.draft.set(null); this.screen.set('overview'); }
  deleteFromForm() {
    const id = this.draft()?.id;
    this.draft.set(null);
    this.screen.set('overview');
    if (id && this.itemExists(id)) this.deleteItem(id);
  }

  // ---- action sheet ----
  openSheet(id: string) { this.sheetId.set(id); }
  sheetEdit() {
    const id = this.sheetId();
    this.sheetId.set(null);
    if (id) this.startEdit(id);
  }
  toggleStatus(kind: Status) {
    const s = this.items().find(i => i.id === this.sheetId());
    this.sheetId.set(null);
    if (!s) return;
    const next: Status = s.status === kind ? 'available' : kind;
    const msg = next === 'available' ? 'Back on your menu' : next === 'sold' ? 'Marked sold out' : 'Hidden from menu';
    this.menuService
      .updateItem(this.menuId, s.id, {
        categoryId: this.catIdByName(s.cat),
        name: s.name,
        description: s.desc.trim() || null,
        priceAmount: s.price || '0',
        visible: next !== 'hidden',
        soldOut: next === 'sold',
      })
      .subscribe({ next: () => { this.reload(); this.flash(msg); }, error: () => this.flash('Could not update item') });
  }
  deleteItem(id: string) {
    this.menuService.deleteItem(this.menuId, id).subscribe({
      next: () => { this.reload(); this.flash('Item deleted'); },
      error: () => this.flash('Could not delete item'),
    });
  }

  onItemOrderChange(itemIds: string[]) {
    const cat = this.activeCat();
    if (cat === 'All' || itemIds.length < 2) return;
    const categoryId = this.catIdByName(cat);
    if (!categoryId) return;

    const before = this.items();
    const group = before.filter(item => item.cat === cat);
    if (!sameMembers(itemIds, group.map(item => item.id))) {
      this.reload();
      return;
    }

    const byId = new Map(group.map(item => [item.id, item]));
    const orderedGroup = itemIds.map(id => byId.get(id)).filter((item): item is EditorItem => !!item);
    let nextIndex = 0;
    this.items.set(before.map(item => (item.cat === cat ? orderedGroup[nextIndex++] : item)));

    this.menuService.reorderItems(this.menuId, { categoryId, itemIds }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.reload();
        this.flash('Could not reorder items');
      },
    });
  }

  // ---- categories ----
  openAddCat(from: 'items' | 'form') {
    this.addCatFrom.set(from);
    this.newCatName.set('');
    this.addCatOpen.set(true);
  }
  addCategory() {
    const name = this.newCatName().trim();
    if (!name) return;
    if (this.cats().some(c => c.toLowerCase() === name.toLowerCase())) {
      this.flash('Category already exists');
      return;
    }
    this.menuService.addCategory(this.menuId, { name }).subscribe({
      next: () => {
        this.gradients[name] = GRAD_PALETTE[this.cats().length % GRAD_PALETTE.length];
        if (this.addCatFrom() === 'form') this.updateDraft('cat', name);
        else this.activeCat.set(name);
        this.addCatOpen.set(false);
        this.reload();
        this.flash('Category added');
      },
      error: () => this.flash('Could not add category'),
    });
  }
  startRename(idx: number) {
    this.renamingIdx.set(idx);
    this.catDraftName.set(this.cats()[idx]);
  }
  commitRename(idx: number) {
    const newName = this.catDraftName().trim();
    const old = this.cats()[idx];
    if (!newName || newName === old) { this.renamingIdx.set(-1); return; }
    if (this.cats().some((c, i) => i !== idx && c.toLowerCase() === newName.toLowerCase())) {
      this.flash('Name already used');
      return;
    }
    const catId = this.catIdByName(old);
    if (!catId) { this.renamingIdx.set(-1); return; }
    this.menuService.renameCategory(this.menuId, catId, { name: newName }).subscribe({
      next: () => {
        if (this.gradients[old] && !this.gradients[newName]) this.gradients[newName] = this.gradients[old];
        if (this.activeCat() === old) this.activeCat.set(newName);
        this.renamingIdx.set(-1);
        this.reload();
        this.flash('Category renamed');
      },
      error: () => { this.renamingIdx.set(-1); this.flash('Could not rename'); },
    });
  }
  deleteCategory(idx: number) {
    const name = this.cats()[idx];
    const catId = this.catIdByName(name);
    if (!catId) return;
    this.menuService.deleteCategory(this.menuId, catId).subscribe({
      next: () => {
        if (this.activeCat() === name) this.activeCat.set('All');
        this.renamingIdx.set(-1);
        this.reload();
        this.flash('Category deleted');
      },
      error: () => this.flash('Could not delete category'),
    });
  }

  onCategoryOrderChange(categoryNames: string[]) {
    if (categoryNames.length < 2) return;
    if (!sameMembers(categoryNames, this.cats())) {
      this.reload();
      return;
    }

    const categoryIds = categoryNames.map(name => this.catIdByName(name)).filter((id): id is string => !!id);
    if (categoryIds.length !== categoryNames.length) {
      this.reload();
      return;
    }

    this.cats.set(categoryNames);
    this.menuService.reorderCategories(this.menuId, { categoryIds }).subscribe({
      next: () => this.reload(),
      error: () => {
        this.reload();
        this.flash('Could not reorder categories');
      },
    });
  }

  // ---- details ----
  selectAccent(color: string) {
    this.accent.set(color);
    this.menuService.setAccent(color);
  }

  onHoursClosedChange(index: number, closed: boolean) {
    this.updateHours(index, row => ({ ...row, closed }));
  }

  onHoursTimeChange(index: number, field: HoursTimeField, value: string) {
    if (!value) return;
    this.updateHours(index, row => ({ ...row, [field]: value }));
  }

  private updateHours(index: number, updater: (row: EditorHoursRow) => EditorHoursRow) {
    this.hoursRows.update(rows => rows.map((row, i) => (i === index ? updater(row) : row)));
    this.hoursTouched.set(true);
  }

  setInstagramHandle(value: string) {
    const handle = value
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/^@+/, '')
      .split(/[/?#]/, 1)[0];
    this.instagramHandle.set(handle);
  }

  toggleCuisine(value: string) {
    this.cuisines.update(values => values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }
  toggleHighlight(value: string) {
    this.highlights.update(values => values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
  }
  addFaq() { this.faqs.update(faqs => [...faqs, { question: '', answer: '' }]); }
  updateFaq(index: number, field: keyof MenuFaq, value: string) {
    this.faqs.update(faqs => faqs.map((faq, i) => i === index ? { ...faq, [field]: value } : faq));
  }
  removeFaq(index: number) { this.faqs.update(faqs => faqs.filter((_, i) => i !== index)); }

  /** PATCH the menu's editable details, including generated display text for hours. */
  private persistDetails(onDone?: () => void) {
    const menu = this.menuModel();
    if (!menu) {
      onDone?.();
      return;
    }
    this.menuService
      .updateMenu(this.menuId, {
        name: this.menuName().trim() || menu.name,
        description: this.description().trim() || null,
        phone: this.phone().trim() || null,
        address: this.address().trim() || null,
        showEmail: this.showEmail(),
        operatingHours: this.hoursTouched() || !menu.operatingHours ? this.operatingHoursText() : menu.operatingHours,
        properties: [
          {
            name: MENU_SOCIAL_LINKS_PROPERTY,
            type: 'JSON',
            value: this.instagramHandle().trim()
              ? JSON.stringify([{ key: 'instagram', handle: this.instagramHandle().trim(), visible: true }])
              : null,
          },
          {
            name: MENU_CONTACT_METHOD_PROPERTY,
            type: 'TEXT',
            value: this.contactMethod() === 'call' ? 'call' : null,
          },
          {
            name: MENU_CUISINES_PROPERTY,
            type: 'JSON',
            value: this.cuisines().length ? JSON.stringify(this.cuisines()) : null,
          },
          {
            name: MENU_HIGHLIGHTS_PROPERTY,
            type: 'JSON',
            value: this.highlights().length ? JSON.stringify(this.highlights()) : null,
          },
          {
            name: MENU_FAQS_PROPERTY,
            type: 'JSON',
            value: this.faqs().some(faq => faq.question.trim() && faq.answer.trim())
              ? JSON.stringify(this.faqs().filter(faq => faq.question.trim() && faq.answer.trim()))
              : null,
          },
        ],
      })
      .subscribe({
        next: updated => {
          this.menuModel.set(updated);
          this.hoursTouched.set(false);
          onDone?.();
        },
        error: () => onDone?.(),
      });
  }

  // ---- logo ----
  onLogoPicked(file: File) {
    if (file.size > LOGO_MAX_BYTES) {
      this.flash('Logo must be under 5 MB');
      return;
    }
    this.openCropper(file, { aspectRatio: 1, round: true, title: 'Move & Scale', target: 'logo' });
  }
  onLogoRejected() {
    this.flash('Logo must be JPEG, PNG or WebP');
  }

  onCoverPicked(file: File) {
    if (file.size > LOGO_MAX_BYTES) {
      this.flash('Hero photo must be under 5 MB');
      return;
    }
    this.openCropper(file, { aspectRatio: COVER_PHOTO_ASPECT, round: false, title: 'Move & Scale', target: 'cover' });
  }
  onCoverRejected() {
    this.flash('Hero photo must be JPEG, PNG or WebP');
  }

  // ---- photo ----
  onPhotoPicked(file: File) {
    if (!this.draft()) return;
    if (file.size > LOGO_MAX_BYTES) {
      this.flash('Photo must be under 5 MB');
      return;
    }
    this.openCropper(file, { aspectRatio: ITEM_PHOTO_ASPECT, round: false, title: 'Move & Scale', target: 'item' });
  }
  onPhotoRejected() {
    this.flash('Photo must be JPEG, PNG or WebP');
  }

  // ---- crop step ----
  private openCropper(file: File, opts: { aspectRatio: number; round: boolean; title: string; target: CropTarget }) {
    this.pendingFile = file;
    this.cropTarget = opts.target;
    this.cropAspect.set(opts.aspectRatio);
    this.cropRound.set(opts.round);
    this.cropTitle.set(opts.title);
    const reader = new FileReader();
    reader.onload = () => this.cropSrc.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onCropDismissed() {
    this.cropSrc.set(null);
    this.pendingFile = null;
    this.cropTarget = null;
  }

  /** The menu already exists, so the logo uploads immediately (no save-deferral like items). */
  onCropConfirmed(blob: Blob) {
    const target = this.cropTarget;
    const source = this.pendingFile;
    this.cropSrc.set(null);
    this.cropTarget = null;
    this.pendingFile = null;
    if (!target || !source) return;
    const file = new File([blob], source.name, { type: blob.type });

    if (target === 'logo') {
      const preview = URL.createObjectURL(file);
      this.logoUrl.set(preview); // optimistic
      this.logoUploading.set(true);
      this.menuService.uploadLogo(this.menuId, file).subscribe({
        next: menu => {
          this.logoUploading.set(false);
          this.logoUrl.set(menu.logoUrl ?? '');
          URL.revokeObjectURL(preview);
          this.flash('Logo updated');
        },
        error: () => {
          this.logoUploading.set(false);
          this.logoUrl.set(this.menuModel()?.logoUrl ?? ''); // revert
          URL.revokeObjectURL(preview);
          this.flash('Could not upload logo');
        },
      });
      return;
    }

    if (target === 'cover') {
      const preview = URL.createObjectURL(file);
      this.coverUrl.set(preview);
      this.coverUploading.set(true);
      this.menuService.uploadMedia(this.menuId, 'cover', file).subscribe({
        next: menu => {
          this.menuModel.set(menu);
          this.coverUploading.set(false);
          this.coverUrl.set(coverUrlFrom(menu.properties) ?? '');
          URL.revokeObjectURL(preview);
          this.flash('Hero photo updated');
        },
        error: () => {
          this.coverUploading.set(false);
          this.coverUrl.set(coverUrlFrom(this.menuModel()?.properties) ?? '');
          URL.revokeObjectURL(preview);
          this.flash('Could not upload hero photo');
        },
      });
      return;
    }

    const d = this.draft();
    if (d) this.draft.set({ ...d, photoFile: file, photoUrl: URL.createObjectURL(file) });
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private flash(msg: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(msg);
    this.toastTimer = setTimeout(() => this.toast.set(''), 1900);
  }
}

function cloneHours(rows: EditorHoursRow[]): EditorHoursRow[] {
  return rows.map(row => ({ ...row }));
}

function formatOperatingHours(rows: EditorHoursRow[]): string {
  return groupHours(rows)
    .map(group => {
      const day = group.start.key === group.end.key ? group.start.shortDay : group.start.shortDay + '-' + group.end.shortDay;
      return day + ' ' + group.text;
    })
    .join('; ');
}

function summarizeHours(rows: EditorHoursRow[]): EditorHoursSummaryRow[] {
  return groupHours(rows).map(group => ({
    dayLabel: group.start.key === group.end.key ? group.start.day : group.start.day + ' - ' + group.end.day,
    timeLabel: group.text,
    closed: group.text === 'Closed',
  }));
}

function groupHours(rows: EditorHoursRow[]): { start: EditorHoursRow; end: EditorHoursRow; text: string }[] {
  const groups: { start: EditorHoursRow; end: EditorHoursRow; text: string }[] = [];
  for (const row of rows) {
    const text = row.closed ? 'Closed' : formatTime(row.openTime) + ' - ' + formatTime(row.closeTime);
    const last = groups.at(-1);
    if (last?.text === text) last.end = row;
    else groups.push({ start: row, end: row, text });
  }
  return groups;
}
function formatTime(time: string): string {
  const [hourRaw, minuteRaw = '00'] = time.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parseOperatingHours(text: string): EditorHoursRow[] | null {
  const rows = cloneHours(DEFAULT_HOURS).map(row => ({ ...row, closed: true }));
  const parts = text.split(/[;\n]+/).map(part => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  for (const part of parts) {
    const match = /^(Every day|[A-Za-z]{3}(?:-[A-Za-z]{3})?)\s+(.+)$/i.exec(part);
    if (!match) return null;

    const dayIndexes = indexesForDayLabel(match[1]);
    if (!dayIndexes.length) return null;

    const hoursText = match[2].trim();
    const closed = /^Closed$/i.test(hoursText);
    const timeMatch = /^(.+?)\s*-\s*(.+)$/.exec(hoursText);
    if (!closed && !timeMatch) return null;

    for (const index of dayIndexes) {
      rows[index].closed = closed;
      if (timeMatch) {
        rows[index].openTime = parseTime(timeMatch[1]) ?? rows[index].openTime;
        rows[index].closeTime = parseTime(timeMatch[2]) ?? rows[index].closeTime;
      }
    }
  }

  return rows;
}

function indexesForDayLabel(label: string): number[] {
  if (/^Every day$/i.test(label)) return DEFAULT_HOURS.map((_, index) => index);
  const shortDays = DEFAULT_HOURS.map(row => row.shortDay.toLowerCase());
  const [start, end] = label.toLowerCase().split('-');
  const startIndex = shortDays.indexOf(start);
  const endIndex = end ? shortDays.indexOf(end) : startIndex;
  if (startIndex < 0 || endIndex < startIndex) return [];
  return Array.from({ length: endIndex - startIndex + 1 }, (_, offset) => startIndex + offset);
}

function parseTime(value: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const suffix = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const remaining = new Set(b);
  for (const id of a) {
    if (!remaining.delete(id)) return false;
  }
  return remaining.size === 0;
}
