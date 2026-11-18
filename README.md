# dockview-solid-poc

A proof of concept showing that [dockview](https://dockview.dev) runs in Solid 2 without a wrapper package. It uses `dockview-core` plus about 200 lines of glue code.

- `src/dockview-solid/`: the glue. Copy this folder into your project to use it.
- `src/demo/`: dockview.dev's full-page demo, ported to Solid.

```
pnpm install && pnpm dev
```
