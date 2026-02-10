import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopoPathEditorDialogComponent } from './topo-path-editor-dialog';
import { ToposService, ToastService } from '../services';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { Component, Input, Pipe, PipeTransform } from '@angular/core';
import { TopoDetail, TopoRouteWithRoute } from '../models/topo.model';
import { AvatarGradeComponent } from '../components/avatar-grade';

@Pipe({name: 'translate', standalone: true})
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}

@Component({selector: 'app-avatar-grade', template: '', standalone: true})
class MockAvatarGradeComponent {
  @Input() grade: string = '';
  @Input() size: string = '';
}

describe('TopoPathEditorDialogComponent', () => {
  let component: TopoPathEditorDialogComponent;
  let fixture: ComponentFixture<TopoPathEditorDialogComponent>;

  const mockToposService = {
    updateRoutePath: jasmine.createSpy('updateRoutePath').and.resolveTo()
  };
  const mockToastService = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error')
  };

  const mockTopo: TopoDetail = {
    id: 1,
    name: 'Test Topo',
    created_at: '',
    crag_id: 1,
    sector_id: 1,
    slug: 'test-topo',
    image_path: 'path',
    user_id: 'user',
    topo_routes: [
      {
        topo_id: 1,
        route_id: 101,
        number: 0,
        route: {
            id: 101,
            name: 'Route 1',
            grade: 20, // number
            sector_id: 1,
            slug: 'r1',
            created_at: '',
            user_creator_id: '',
            climbing_kind: 'sport' // Added required field
        }
      },
      {
        topo_id: 1,
        route_id: 102,
        number: 1,
        route: {
            id: 102,
            name: 'Route 2',
            grade: 21, // number
            sector_id: 1,
            slug: 'r2',
            created_at: '',
            user_creator_id: '',
            climbing_kind: 'sport' // Added required field
        }
      },
    ]
  } as any; // Cast to any to avoid strict interface matching issues if I missed some fields

  const mockContext = {
    data: {
      topo: mockTopo,
      imageUrl: 'test.jpg',
    },
    completeWith: jasmine.createSpy('completeWith'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopoPathEditorDialogComponent, MockTranslatePipe],
      providers: [
        { provide: ToposService, useValue: mockToposService },
        { provide: ToastService, useValue: mockToastService },
        { provide: POLYMORPHEUS_CONTEXT, useValue: mockContext },
      ],
    })
    .overrideComponent(TopoPathEditorDialogComponent, {
      remove: { imports: [AvatarGradeComponent, TranslatePipe] },
      add: { imports: [MockAvatarGradeComponent, MockTranslatePipe] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopoPathEditorDialogComponent);
    component = fixture.componentInstance;

    // Mock image element since we don't load real image
    component.imageElement = {
      nativeElement: {
        clientWidth: 1000,
        clientHeight: 800
      }
    } as any;

    component.containerElement = {
      nativeElement: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 800 })
      }
    } as any;

    fixture.detectChanges();
  });

  it('should initialize with first route selected', () => {
    expect(component.selectedRoute()?.route_id).toBe(101);
  });

  it('should toggle selection when clicked from list', () => {
    const route1 = mockTopo.topo_routes[0];

    // Initial state: 101 selected
    expect(component.selectedRoute()?.route_id).toBe(101);

    // Click 101 from list -> deselect
    component.selectRoute(route1, true);
    expect(component.selectedRoute()).toBeNull();

    // Click 101 from list -> select
    component.selectRoute(route1, true);
    expect(component.selectedRoute()?.route_id).toBe(101);
  });

  it('should switch selection when clicking another item from list', () => {
    const route2 = mockTopo.topo_routes[1];

    // Initial state: 101 selected
    component.selectRoute(route2, true);
    expect(component.selectedRoute()?.route_id).toBe(102);
  });

  it('should NOT switch selection when clicking canvas if a route is already selected', () => {
    const route2 = mockTopo.topo_routes[1];

    // Initial state: 101 selected
    expect(component.selectedRoute()?.route_id).toBe(101);

    // Click 102 from canvas (fromList=false)
    component.selectRoute(route2, false);

    // Should still be 101
    expect(component.selectedRoute()?.route_id).toBe(101);
  });

  it('should select route from canvas if NOTHING is currently selected', () => {
    const route2 = mockTopo.topo_routes[1];

    // Deselect all
    component.selectedRoute.set(null);
    expect(component.selectedRoute()).toBeNull();

    // Click 102 from canvas
    component.selectRoute(route2, false);

    // Should be 102
    expect(component.selectedRoute()?.route_id).toBe(102);
  });
});
