import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, Subject, of } from 'rxjs';
import { publishReplay, refCount, map, distinctUntilChanged, filter, throttleTime } from 'rxjs/operators';
import { Box, BoxElementCoords } from './box.model';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { WINDOW } from '@services/window';

@Injectable({
  providedIn: 'root',
})
export class BoxService {
  private event$: BehaviorSubject<Box> = new BehaviorSubject(null);

  private load$: Subject<boolean> = new Subject();

  private resize$ = fromEvent(this.window, 'resize', { passive: true }).pipe(
    map((w: Event): HTMLElement => this?.document?.documentElement),
    publishReplay(1),
    refCount(),
  );

  private scroll$ = fromEvent(this.document, 'scroll', { passive: true }).pipe(
    map((w: Event): HTMLElement => this?.document?.documentElement),
    publishReplay(1),
    refCount(),
  );

  private viewClientRect$ = merge(this.resize$, this.scroll$).pipe(publishReplay(1), refCount());

  private eventObservable = this.event$.pipe(
    filter((data) => !!data),
    distinctUntilChanged((prev, curr) => prev.width + prev.height === curr.width + curr.height),
    publishReplay(1),
    refCount(),
  );

  public isBrowser;

  private boxCurrentValues: Box = null;

  constructor(
    @Inject(WINDOW) public readonly window: Window,
    @Inject(DOCUMENT) public document: Document,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (isPlatformBrowser(platformId)) {
      this.resize$
        .pipe(
          throttleTime(100),
          map((data: HTMLElement) => {
            const width = data?.clientWidth;
            const height = data?.clientHeight;

            this.event$.next({
              isBrowser: this.isBrowser,
              width,
              height,
            } as Box);

            return {
              width,
              height,
            };
          }),
        )
        .subscribe();

      setTimeout(() => {
        this.window.dispatchEvent(new Event('resize'));
      });
    }
  }

  get resize() {
    if (!this.isBrowser) {
      return of(null);
    }

    return this.resize$;
  }

  get scroll() {
    if (!this.isBrowser) {
      return of(null);
    }

    return this.scroll$;
  }

  get viewClientRect() {
    if (!this.isBrowser) {
      return of(null);
    }

    return this.viewClientRect$;
  }

  get subscription(): Observable<Box> {
    return this.eventObservable;
  }

  getElementCoords(elem: HTMLElement): BoxElementCoords | null {
    if (this.isBrowser) {
      const box = elem.getBoundingClientRect();
      const body = this.document.body;
      const docEl = this.document.documentElement;

      const scrollTop = this.window.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft = this.window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const clientTop = docEl.clientTop || body.clientTop || 0;
      const clientLeft = docEl.clientLeft || body.clientLeft || 0;

      const top = box.top + scrollTop - clientTop;
      const left = box.left + scrollLeft - clientLeft;

      return { top: Math.round(top), left: Math.round(left) };
    } else {
      return null;
    }
  }

  get changed(): Observable<Box> {
    return this.event$;
  }
}
