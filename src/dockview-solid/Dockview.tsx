// dockview-solid: copy this whole folder into your project. Needs `dockview-core` and Solid, plus the stylesheet
// from the `dockview` package (no React inside): import "dockview/dist/styles/dockview.css" once in your app.
// Popout groups also need an empty page at dockview's `popoutUrl` (default /popout.html), e.g. public/popout.html.
import { getOwner, onSettled, type Component } from "solid-js";
import { createDockview, type DockviewApi, type DockviewComponentOptions } from "dockview-core";
import {
  contextMenuItemRenderer,
  headerActionsRenderer,
  panelRenderer,
  type ContextMenuItemProps,
  type HeaderActionsProps,
  type PanelProps,
} from "./renderers";

/** All props are read once, when the layout is created; change the layout afterwards through the api from `onReady`. */
export type DockviewProps = {
  /** Panel content components, keyed by the `component` name given to `api.addPanel`. */
  components: Record<string, Component<PanelProps<any>>>;
  leftHeaderActions?: Component<HeaderActionsProps>;
  rightHeaderActions?: Component<HeaderActionsProps>;
  prefixHeaderActions?: Component<HeaderActionsProps>;
  /** Called once with the dockview api, after the layout element is in the page. */
  onReady: (api: DockviewApi) => void;
  /** Any other dockview-core option (theme, getTabContextMenuItems, ...), passed through unchanged. */
  options?: Omit<DockviewComponentOptions, `create${string}`>;
  class?: string;
};

export function Dockview(props: DockviewProps) {
  // Captured now: dockview builds panels later (e.g. from a click handler), where getOwner() is null
  const owner = getOwner();
  let host!: HTMLDivElement;

  const header = (Comp?: Component<HeaderActionsProps>) =>
    Comp && ((group: Parameters<typeof headerActionsRenderer>[2]) => headerActionsRenderer(Comp, owner, group));

  onSettled(() => {
    const api = createDockview(host, {
      ...props.options,
      createComponent: ({ name }) => {
        const Comp = props.components[name];
        if (!Comp) throw new Error(`dockview-solid: no component registered as "${name}"`);
        return panelRenderer(Comp, owner);
      },
      createLeftHeaderActionComponent: header(props.leftHeaderActions),
      createRightHeaderActionComponent: header(props.rightHeaderActions),
      createPrefixHeaderActionComponent: header(props.prefixHeaderActions),
      // dockview types `component` as unknown; returning undefined skips an item that isn't a component
      createContextMenuItemComponent: ({ component }) =>
        typeof component === "function"
          ? contextMenuItemRenderer(component as Component<ContextMenuItemProps>, owner)
          : undefined,
    });
    try {
      props.onReady(api);
    } catch (err) {
      api.dispose(); // otherwise the layout's DOM and window listeners outlive the component
      throw err;
    }
    return () => api.dispose();
  });

  return <div ref={host} class={props.class} style={{ "flex-grow": 1, height: "100%" }} />;
}
