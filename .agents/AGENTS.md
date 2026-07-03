# Workspace Rules

## Angular Best Practices

- **Do NOT invoke functions/methods directly in template bindings/interpolations/control flow (e.g. `@if (showRowBreak(item))`, `{{ computeValue() }}`)**: Doing so triggers function execution on every change detection cycle, causing severe performance issues. Instead:
  - Use a pure Angular **Pipe** to compute the value.
  - Use a **computed signal** (`computed()`) to derive the value reactively.
  - Pre-process the array/data in the component class to append computed flags/properties before binding.
