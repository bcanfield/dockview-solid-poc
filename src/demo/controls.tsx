// Ported from dockview's demo-dockview template: the group header actions.
import { createSignal, onCleanup, Show } from "solid-js";
import type { HeaderActionsProps } from "../dockview-solid";
import { nextId } from "./defaultLayout";

const Icon = (props: { icon: string; title?: string; onClick?: (e: MouseEvent) => void }) => (
  <div title={props.title} class="action" onClick={props.onClick}>
    <span style={{ "font-size": "inherit" }} class="material-symbols-outlined">
      {props.icon}
    </span>
  </div>
);

const groupControlStyle = {
  display: "flex",
  "align-items": "center",
  padding: "0px 8px",
  height: "100%",
  color: "var(--dv-activegroup-visiblepanel-tab-color)",
};

// Extra icon shown when a given panel is active in the focused group
const groupControlIcons: Record<string, string> = { panel_1: "file_download" };

export const RightControls = (props: HeaderActionsProps) => {
  const [isMaximized, setIsMaximized] = createSignal(props.containerApi.hasMaximizedGroup());
  const sub = props.containerApi.onDidMaximizedGroupChange(() => setIsMaximized(props.containerApi.hasMaximizedGroup()));
  onCleanup(() => sub.dispose());

  const isPopout = () => props.location.type === "popout";
  const extraIcon = () => (props.isGroupActive && props.activePanel ? groupControlIcons[props.activePanel.id] : undefined);

  const toggleMaximize = () => {
    if (props.containerApi.hasMaximizedGroup()) props.containerApi.exitMaximizedGroup();
    else props.activePanel?.api.maximize();
  };
  const togglePopout = () => {
    if (!isPopout()) props.containerApi.addPopoutGroup(props.group);
    else props.api.moveTo({ position: "right" });
  };

  return (
    <div class="group-control" style={groupControlStyle}>
      <Show when={props.isGroupActive}>
        <Icon icon="star" />
      </Show>
      <Show when={extraIcon()}>
        <Icon icon={extraIcon()!} />
      </Show>
      <Icon
        title={isPopout() ? "Close Window" : "Open In New Window"}
        icon={isPopout() ? "close_fullscreen" : "open_in_new"}
        onClick={togglePopout}
      />
      <Show when={!isPopout()}>
        <Icon
          title={isMaximized() ? "Minimize View" : "Maximize View"}
          icon={isMaximized() ? "collapse_content" : "expand_content"}
          onClick={toggleMaximize}
        />
      </Show>
    </div>
  );
};

export const LeftControls = (props: HeaderActionsProps) => (
  <div class="group-control" style={groupControlStyle}>
    <Icon
      icon="add"
      onClick={() =>
        props.containerApi.addPanel({
          id: `id_${Date.now().toString()}`,
          component: "default",
          title: `Tab ${nextId()}`,
          position: { referenceGroup: props.group },
        })
      }
    />
  </div>
);

export const PrefixHeaderControls = (_props: HeaderActionsProps) => (
  <div class="group-control" style={groupControlStyle}>
    <Icon icon="Menu" />
  </div>
);
