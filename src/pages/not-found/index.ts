import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="p-6">
      <h1 class="text-2xl font-semibold">404 — Página no encontrada</h1>
      <p class="mt-2">La ruta solicitada no existe.</p>
      <a routerLink="/home" class="text-blue-600 underline mt-4 inline-block"
        >Ir al inicio</a
      >
    </section>
  `,
})
export class NotFoundComponent {}

export { NotFoundComponent as default };
