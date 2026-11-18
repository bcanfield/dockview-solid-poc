// dockview-solid: copy this whole folder into your project. Needs only `dockview-core` and Solid.
// Each function here builds one of dockview-core's renderer objects and mounts a Solid component into it.
import { createRoot, createSignal, runWithOwner, type Component, type Owner } from "solid-js";
import { insert, registerDelegatedRoot, unregisterDelegatedRoot } from "@solidjs/web";
import type {
  DockviewApi,
  DockviewGroupLocation,
  DockviewGroupPanel,
  DockviewGroupPanelApi,
  DockviewPanelApi,
  IContentRenderer,
  IContextMenuItemComponentProps,
  IContextMenuItemRenderer,
  IDockviewPanel,
  IHeaderActionsRenderer,
} from "dockview-core";

/**
 * Props of a panel's content component. `params` and `title` are reactive; read `title` here, not `api.title`,
 * which is still unset when the component first runs.
 */
export type PanelProps<P extends Record<string, any> = Record<string, any>> = {
  readonly params: P;
  readonly title: string | undefined;
  api: DockviewPanelApi;
  containerApi: DockviewApi;
};

/** Props of a group header actions component (left, right or prefix). The getters are reactive. */
export type HeaderActionsProps = {
  api: DockviewGroupPanelApi;
  containerApi: DockviewApi;
  group: DockviewGroupPanel;
  readonly panels: IDockviewPanel[];
  readonly activePanel: IDockviewPanel | undefined;
  readonly isGroupActive: boolean;
  readonly location: DockviewGroupLocation;
};

/** Props of a `{ component }` item returned from `getTabContextMenuItems`. */
export type ContextMenuItemProps = IContextMenuItemComponentProps;

// This is render() from @solidjs/web without its flush(). Solid 2 throws if flush() runs inside onSettled,
// and dockview mounts parts synchronously wherever addPanel is called. Solid flushes on the next microtask anyway.
function mount<P extends object>(Comp: Component<P>, props: P, element: HTMLElement, owner: Owner | null) {
  // Listeners sit on the element itself, so clicks keep working after dockview moves it into a popout window
  registerDelegatedRoot(element);
  // runWithOwner keeps the app's context visible inside panels
  const dispose = runWithOwner(owner, () =>
    createRoot((d) => {
      insert(element, () => <Comp {...props} />);
      return d;
    }),
  );
  return () => {
    dispose();
    unregisterDelegatedRoot(element);
    element.textContent = "";
  };
}

function fullSizeDiv() {
  const element = document.createElement("div");
  element.style.height = "100%";
  element.style.width = "100%";
  return element;
}

export function panelRenderer(Comp: Component<PanelProps<any>>, owner: Owner | null): IContentRenderer {
  const element = fullSizeDiv();
  const [params, setParams] = createSignal<Record<string, any>>({});
  const [title, setTitle] = createSignal<string | undefined>(undefined);
  let titleSub: { dispose(): void } | undefined;
  let dispose = () => {};
  return {
    element,
    init(p) {
      setParams(p.params ?? {});
      setTitle(p.api.title);
      titleSub = p.api.onDidTitleChange((e) => setTitle(e.title));
      const props = {
        get params() { return params(); },
        get title() { return title(); },
        api: p.api,
        containerApi: p.containerApi,
      };
      dispose = mount(Comp, props, element, owner);
    },
    update(e) {
      setParams((prev) => ({ ...prev, ...e.params }));
    },
    dispose() {
      titleSub?.dispose();
      dispose();
    },
  };
}

// Mirrors dockview-react's ReactHeaderActionsRendererPart: the same five events refresh the props.
export function headerActionsRenderer(
  Comp: Component<HeaderActionsProps>,
  owner: Owner | null,
  group: DockviewGroupPanel,
): IHeaderActionsRenderer {
  const element = fullSizeDiv();
  const read = () => ({
    panels: group.model.panels,
    activePanel: group.model.activePanel,
    isGroupActive: group.api.isActive,
    location: group.api.location,
  });
  // equals: false because dockview mutates its panels array in place, so the reference never changes
  const [state, setState] = createSignal(read(), { equals: false });
  const subscriptions: { dispose(): void }[] = [];
  let dispose = () => {};
  return {
    element,
    init(p) {
      const sync = () => setState(read());
      subscriptions.push(
        group.model.onDidAddPanel(sync),
        group.model.onDidRemovePanel(sync),
        group.model.onDidActivePanelChange(sync),
        p.api.onDidActiveChange(sync),
        p.api.onDidLocationChange(sync),
      );
      const props: HeaderActionsProps = {
        api: p.api,
        containerApi: p.containerApi,
        group,
        get panels() { return state().panels; },
        get activePanel() { return state().activePanel; },
        get isGroupActive() { return state().isGroupActive; },
        get location() { return state().location; },
      };
      dispose = mount(Comp, props, element, owner);
    },
    dispose() {
      subscriptions.forEach((s) => s.dispose());
      dispose();
    },
  };
}

export function contextMenuItemRenderer(Comp: Component<ContextMenuItemProps>, owner: Owner | null): IContextMenuItemRenderer {
  const element = document.createElement("div");
  let dispose = () => {};
  return {
    element,
    init(p) {
      dispose = mount(Comp, p as ContextMenuItemProps, element, owner);
    },
    dispose() {
      dispose();
    },
  };
}
