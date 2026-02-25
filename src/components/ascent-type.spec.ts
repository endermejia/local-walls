import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AscentTypeComponent } from './ascent-type';
import { AscentsService } from '../services/ascents.service';
import { TranslateModule } from '@ngx-translate/core';
import { computed } from '@angular/core';

describe('AscentTypeComponent', () => {
  let component: AscentTypeComponent;
  let fixture: ComponentFixture<AscentTypeComponent>;

  const ascentsServiceMock = {
    ascentInfo: computed(() => ({
      rp: { background: 'red', icon: 'rp' },
      os: { background: 'green', icon: 'os' },
      default: { background: 'grey', icon: 'default' }
    }))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AscentTypeComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AscentsService, useValue: ascentsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AscentTypeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'rp');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should treat 0 attempts as no attempts', () => {
    fixture.componentRef.setInput('attempts', 0);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).hasAttempts()).toBe(false);
  });

  it('should treat null attempts as no attempts', () => {
    fixture.componentRef.setInput('attempts', null);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).hasAttempts()).toBe(false);
  });

  it('should treat undefined attempts as no attempts', () => {
    fixture.componentRef.setInput('attempts', undefined);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).hasAttempts()).toBe(false);
  });

  it('should treat > 0 attempts as having attempts', () => {
    fixture.componentRef.setInput('attempts', 1);
    fixture.detectChanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((component as any).hasAttempts()).toBe(true);
  });
});
