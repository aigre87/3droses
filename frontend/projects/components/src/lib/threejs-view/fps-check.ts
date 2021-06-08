import { animationFrameScheduler, BehaviorSubject, EMPTY, NEVER, Observable, of, race, Subject, timer } from 'rxjs';
import { delay, finalize, map, pairwise, repeat, repeatWhen, takeUntil, tap } from 'rxjs/operators';

export type StreamStatus = 'Initialize' | 'Stopped on time' | 'Stopped on event' | 'Restarted' | 'Complete';
export interface FpsCheckParameters {
  lsKey?: string | null;
}
export class FpsCheck {
  private destroyed$ = new Subject();
  stream$: Observable<any>;
  private prefixLS = 'fpsCheck-';
  lsKey: FpsCheckParameters['lsKey'];
  fpsIsLow$ = new BehaviorSubject(false);
  private checkTime = 3000;
  public fps = {
    value: null,
    times: [],
    avgArray: [],
    avg: {
      ready: false,
      times: [],
      value: null,
    },
    firstCatchLowFps: false,
    secondCatchLowFps: false,
  };

  private streamStatus$: BehaviorSubject<StreamStatus> = new BehaviorSubject('Initialize');
  private streamStop$ = new Subject();
  private streamStart$ = new Subject();

  constructor(options: FpsCheckParameters = { lsKey: null }) {
    Object.keys(options).forEach((key) => {
      if (key === 'lsKey' && typeof options[key] === 'string') {
        this.lsKey = this.prefixLS + options[key];
        return;
      }
      this[key] = options[key];
    });
    this.preInit();
  }

  startStream() {
    this.streamStart$.next();
  }

  stopStream() {
    this.streamStop$.next();
  }

  getStreamStatusValue() {
    this.streamStatus$.getValue();
  }

  private preInit() {
    if (this.isHaveLocalStorageLowFps()) {
      this.fpsIsLow$.next(true);
    }
  }

  init() {
    if (this.stream$) return;
    this.stream$ = of(null, animationFrameScheduler).pipe(
      repeat(),
      finalize(() => {
        this.streamStatus$.next('Complete');
      }),
      takeUntil(
        race(
          timer(3000).pipe(
            tap((d) => {
              this.streamStatus$.next('Stopped on time');
            }),
          ),
          this.streamStop$.pipe(
            tap((s) => {
              this.streamStatus$.next('Stopped on event');
            }),
          ),
        ),
      ),
      repeatWhen(() =>
        this.streamStart$.pipe(
          delay(1),
          map((data) => {
            this.streamStatus$.next('Restarted');
            return of(data);
            if (this.streamStatus$.getValue() === 'Complete') {
              return EMPTY;
            }
            return NEVER;
          }),
        ),
      ),
    );

    this.stream$.pipe(takeUntil(this.destroyed$)).subscribe((data) => {
      this.rafTickFnc();
    });

    const timerLog = new Date().valueOf();
    this.streamStatus$.pipe(takeUntil(this.destroyed$), pairwise()).subscribe((data: [StreamStatus, StreamStatus]) => {
      // console.log(' +', ((new Date().valueOf() - timerLog) / 1000).toFixed(2) + ' мс ', '\tStream status : ', data[1]);
      if (data[1] === 'Stopped on event') {
        this.rafCancel();
      }
      if (data[0] === 'Stopped on time' && data[1] === 'Complete') {
        this.fps.avg.ready = true;
        // second try
        if (
          this.fps.avg.ready &&
          this.fps.avg.value < 25 &&
          this.fps.firstCatchLowFps === true &&
          this.fps.secondCatchLowFps !== true
        ) {
          this.fps.secondCatchLowFps = true;
          this.fpsIsLow$.next(true);
          if (this.lsKey) {
            window.localStorage.setItem(this.lsKey, new Date().getTime().toString());
          }
        }
        // first try
        if (
          this.fps.avg.ready &&
          this.fps.avg.value < 35 &&
          this.fps.firstCatchLowFps === false &&
          this.fps.secondCatchLowFps === false
        ) {
          this.fps.firstCatchLowFps = true;
          this.streamStart$.next();
        }
      }
    });
  }
  private rafTickFnc(): void {
    const now = performance.now();
    while (this.fps.times.length > 0 && this.fps.times[0] <= now - 1000) {
      this.fps.times.shift();
    }
    this.fps.times.push(now);
    this.fps.value = this.fps.times.length;

    while (this.fps.avg.times.length > 0 && this.fps.avg.times[0].timestamp <= now - this.checkTime) {
      this.fps.avg.times.shift();
    }

    this.fps.avg.times.push({
      timestamp: now,
      value: this.fps.value,
    });

    const sum = this.fps.avg.times.reduce((acc, b) => acc + b.value, 0);
    const avg = sum / this.fps.avg.times.length || 0;
    this.fps.avg.value = avg;
  }
  private rafCancel() {
    this.fps.avg.value = null;
    this.fps.avg.times = [];
    this.fps.avg.ready = false;
    this.fps.times = [];
    this.fps.value = null;
    this.fps.firstCatchLowFps = false;
    this.fps.secondCatchLowFps = false;
  }
  isHaveLocalStorageLowFps(): boolean {
    if (!this.lsKey) return false;
    const expiredHours = 24 * 1; // 1 day, save time localstorage
    const now = new Date().getTime();
    const setupTime = localStorage.getItem(this.lsKey);
    if (setupTime === null) {
      return false;
    } else {
      if (now - parseInt(setupTime, 0) > expiredHours * 60 * 60 * 1000) {
        window.localStorage.removeItem(this.lsKey);
        return false;
      } else {
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.destroyed$.next();
  }
}
