import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AscentCommentsComponent } from './ascent-comments';
import { AscentsService } from '../services/ascents.service';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

describe('AscentCommentsComponent', () => {
  let component: AscentCommentsComponent;
  let fixture: ComponentFixture<AscentCommentsComponent>;

  const ascentsServiceMock = {
    getCommentsCount: (id: number) => Promise.resolve(0),
    ascentCommentsUpdate: new Subject<number>(),
    openCommentsDialog: (id: number) => ({ subscribe: () => {} }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AscentCommentsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AscentsService, useValue: ascentsServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AscentCommentsComponent);
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
