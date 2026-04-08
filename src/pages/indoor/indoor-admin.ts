import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';

import { TuiButton } from '@taiga-ui/core';
import { TuiTabs } from '@taiga-ui/kit';

@Component({
  selector: 'app-indoor-admin',
  standalone: true,
  imports: [CommonModule, TuiTabs, TuiButton],
  template: `
    <div class="flex flex-col h-full overflow-y-auto p-4 bg-base-100 max-w-5xl mx-auto w-full">
      <h1 class="text-3xl font-bold mb-6">Administración de Centro Indoor</h1>

      <tui-tabs [(activeItemIndex)]="activeTab" class="mb-6">
        <button tuiTab>Información</button>
        <button tuiTab>Topos</button>
        <button tuiTab>Rutas</button>
        <button tuiTab>Bonos</button>
        <button tuiTab>Administradores</button>
        <button tuiTab>Contabilidad</button>
      </tui-tabs>

      <div class="bg-base-200 p-6 rounded-lg">
        @if (activeTab() === 0) {
          <h2 class="text-xl font-bold mb-4">Información del Centro</h2>
          <p class="text-base-content/70">Formulario para editar nombre, descripción y contacto.</p>
        }

        @if (activeTab() === 1) {
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Gestión de Topos</h2>
            <button tuiButton size="m">Nuevo Topo</button>
          </div>
          <p class="text-base-content/70">Lista de topos y opciones de edición.</p>
        }

        @if (activeTab() === 2) {
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Gestión de Rutas</h2>
            <button tuiButton size="m">Nueva Ruta</button>
          </div>
          <p class="text-base-content/70">Lista de rutas y opciones de edición.</p>
        }

        @if (activeTab() === 3) {
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Gestión de Bonos</h2>
            <button tuiButton size="m">Nuevo Bono</button>
          </div>
          <p class="text-base-content/70">Opciones para crear y modificar pases.</p>
        }

        @if (activeTab() === 4) {
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Administradores</h2>
            <button tuiButton size="m">Añadir Admin</button>
          </div>
          <p class="text-base-content/70">Gestión de usuarios con acceso a la administración del centro.</p>
        }

        @if (activeTab() === 5) {
          <h2 class="text-xl font-bold mb-4">Contabilidad</h2>
          <p class="text-base-content/70">Panel de ingresos y estadísticas de bonos vendidos.</p>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminComponent {
  protected readonly activeTab = signal(0);
}
