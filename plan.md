1. **Refactor `RoutesTableComponent`**
   - Write and execute a Node.js script (e.g., `refactor_routes_table.cjs`) to update `src/components/route/routes-table.ts` by removing the indoor/outdoor logic, services (`RoutesService`, `IndoorService`, `AscentsService`, `ToposService`), and replacing actions with simple outputs.

2. **Verify `RoutesTableComponent` Refactor**
   - Use `read_file` to verify the modifications to `src/components/route/routes-table.ts`.

3. **Create `IndoorRoutesTableComponent`**
   - Write and execute a temporary Node.js script to create the file `src/components/route/indoor-routes-table.ts`.
   - Insert the extracted indoor logic (handling data fetching, log ascent, edit, delete, adding to topo) that was previously in the routes table, and render `<app-routes-table>` in its template.

4. **Verify `IndoorRoutesTableComponent` Creation**
   - Use `read_file` to verify the creation and content of `src/components/route/indoor-routes-table.ts`.

5. **Create `OutdoorRoutesTableComponent`**
   - Write and execute a temporary Node.js script to create the file `src/components/route/outdoor-routes-table.ts`.
   - Insert the extracted outdoor logic (e.g., `RoutesService` calls, toggling project, edit route, delete outdoor route, adding to topos), and render `<app-routes-table>` in its template.

6. **Verify `OutdoorRoutesTableComponent` Creation**
   - Use `read_file` to verify the creation and content of `src/components/route/outdoor-routes-table.ts`.

7. **Update usages across the app**
   - Write and execute a Node.js script using `run_in_bash_session` to update the following files, replacing `<app-routes-table>` with `<app-indoor-routes-table>` or `<app-outdoor-routes-table>` depending on context:
     - `src/components/user-profile/user-profile-likes.ts`
     - `src/components/user-profile/projects/projects-list.ts`
     - `src/components/crag/crag-routes.ts`
     - `src/pages/indoor/indoor-center.ts`
     - `src/pages/area/equipper.ts`

8. **Verify Usages Update**
   - Run `git diff` to verify the replacements were made correctly across all 5 target files.

9. **Verify changes (Type checking)**
   - Use `bun x tsc --noEmit --project tsconfig.json` to verify that there are no type errors.

10. **Run Tests**
   - Run all relevant tests using `bun x ng test --no-watch --browsers=ChromeHeadless`.

11. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

12. **Submit changes**
   - Create PR with the refactored code using `submit`.
