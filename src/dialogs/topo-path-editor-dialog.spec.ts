import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopoPathEditorDialogComponent } from './topo-path-editor-dialog';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { ToposService } from '../services/topos.service';
import { ToastService } from '../services/toast.service';
import { TranslateModule } from '@ngx-translate/core';
import { provideZonelessChangeDetection } from '@angular/core';

describe('TopoPathEditorDialogComponent', () => {
  let component: TopoPathEditorDialogComponent;
  let fixture: ComponentFixture<TopoPathEditorDialogComponent>;

  const mockContext = {
    data: {
      topo: {
        id: 1,
        name: 'Test Topo',
        topo_routes: [
          {
            route_id: 101,
            route: { id: 101, name: 'Route 1', grade: 10 },
            path: { points: [], color: '#000' }
          }
        ]
      },
      imageUrl: 'test.jpg'
    },
    completeWith: jasmine.createSpy('completeWith')
  };

  const mockToposService = {
    updateRoutePath: jasmine.createSpy('updateRoutePath').and.returnValue(Promise.resolve())
  };

  const mockToastService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TopoPathEditorDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: POLYMORPHEUS_CONTEXT, useValue: mockContext },
        { provide: ToposService, useValue: mockToposService },
        { provide: ToastService, useValue: mockToastService }
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TopoPathEditorDialogComponent);
    component = fixture.componentInstance;

    // Mock the ViewChildren before detection if needed, or rely on template
    // Since template has no *ngIf on viewport, it should be available.
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize transform to scale 1', () => {
    expect(component.transform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('should update transform on wheel (zoom in)', () => {
    // We need to mock getBoundingClientRect of the native element
    const viewportNative = component.viewportElement.nativeElement;
    const rect = {
      left: 0, top: 0, width: 500, height: 500,
      right: 500, bottom: 500, x: 0, y: 0,
      toJSON: () => {}
    };
    spyOn(viewportNative, 'getBoundingClientRect').and.returnValue(rect as DOMRect);

    // Create a mock WheelEvent
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      deltaY: -100, // Zoom in
      clientX: 250, // Center
      clientY: 250
    } as unknown as WheelEvent;

    component.onWheel(event);
    fixture.detectChanges();

    const t = component.transform();
    // With deltaY -100, direction is -1 -> scale * 1.1
    // Initial 1 -> 1.1
    expect(t.scale).toBeCloseTo(1.1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should start panning on right click', () => {
    const event = {
      preventDefault: jasmine.createSpy('preventDefault'),
      button: 2, // Right click
      clientX: 100,
      clientY: 100
    } as unknown as MouseEvent;

    // Spy on window.addEventListener
    spyOn(window, 'addEventListener');

    component.startPanning(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(window.addEventListener).toHaveBeenCalledWith('mousemove', jasmine.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('mouseup', jasmine.any(Function));
  });

  it('should handle panning movement', () => {
    // 1. Start panning
    const startEvent = {
      preventDefault: jasmine.createSpy('preventDefault'),
      button: 2,
      clientX: 100,
      clientY: 100
    } as unknown as MouseEvent;

    let moveHandler: (e: MouseEvent) => void;
    spyOn(window, 'addEventListener').and.callFake(((name: string, handler: EventListenerOrEventListenerObject) => {
        if (name === 'mousemove') moveHandler = handler as any;
    }) as any);

    component.startPanning(startEvent);

    // 2. Trigger move
    const moveEvent = {
        clientX: 110, // Moved +10 X
        clientY: 120  // Moved +20 Y
    } as unknown as MouseEvent;

    // Manually trigger the handler we captured
    if (moveHandler!) moveHandler(moveEvent);

    const t = component.transform();
    expect(t.x).toBe(10);
    expect(t.y).toBe(20);
  });
});
