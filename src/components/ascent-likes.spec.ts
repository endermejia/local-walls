import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AscentLikesComponent } from './ascent-likes';
import { AscentsService } from '../services/ascents.service';
import { TranslateModule } from '@ngx-translate/core';
import { TuiDialogService } from '@taiga-ui/experimental';

describe('AscentLikesComponent', () => {
  let component: AscentLikesComponent;
  let fixture: ComponentFixture<AscentLikesComponent>;

  const ascentsServiceMock = {
    getLikesInfo: (id: number) => Promise.resolve({ likes_count: 0, user_liked: false }),
    refreshResources: (id: number, changes: any) => {},
    toggleLike: (id: number) => Promise.resolve(true),
  };

  const dialogServiceMock = {
    open: () => ({ subscribe: () => {} }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AscentLikesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AscentsService, useValue: ascentsServiceMock },
        { provide: TuiDialogService, useValue: dialogServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AscentLikesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ascentId', 1);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to visible', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).isHidden()).toBe(false);
  });
});
