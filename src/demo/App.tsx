// Ported from dockview's demo-dockview template (the full-page demo on dockview.dev).
import { createSignal } from "solid-js";
import { themeAbyss, type DockviewApi } from "dockview-core";
import { Dockview, type ContextMenuItemProps, type PanelProps } from "../dockview-solid";
import { GridActions, GroupActions, loadSaved, LogLines, PanelActions, type LogLine } from "./actions";
import { LeftControls, PrefixHeaderControls, RightControls } from "./controls";
import { defaultConfig } from "./defaultLayout";
import "./app.css";

const components = {
  default: (props: PanelProps) => (
    <div style={{ height: "100%", overflow: "auto", color: "white", position: "relative" }}>
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          "pointer-events": "none",
          "font-size": "42px",
          opacity: 0.5,
        }}
      >
        {props.title}
      </span>
    </div>
  ),
};

const FloatMenuItem = (props: ContextMenuItemProps) => (
  <div
    class="dv-context-menu-item"
    onClick={() => {
      props.api.addFloatingGroup(props.panel);
      props.close();
    }}
    style={{ display: "flex", "align-items": "center", gap: "6px" }}
  >
    <span class="material-symbols-outlined" style={{ "font-size": "14px" }}>ad_group</span>
    Float tab
  </div>
);

const colors = ["rgba(255,0,0,0.2)", "rgba(0,255,0,0.2)", "rgba(0,0,255,0.2)", "rgba(255,255,0,0.2)", "rgba(0,255,255,0.2)", "rgba(255,0,255,0.2)"];

export default function DockviewDemo() {
  const [logLines, setLogLines] = createSignal<LogLine[]>([]);
  const [panels, setPanels] = createSignal<string[]>([]);
  const [groups, setGroups] = createSignal<string[]>([]);
  const [api, setApi] = createSignal<DockviewApi>();
  const [activePanel, setActivePanel] = createSignal<string>();
  const [activeGroup, setActiveGroup] = createSignal<string>();

  // Lines logged in the same tick share a colour, like the original's per-stack-frame batching
  let pending: LogLine[] = [];
  let colorIndex = 0;
  const addLogLine = (text: string) => {
    if (pending.length === 0) {
      queueMicrotask(() => {
        const backgroundColor = colors[colorIndex++ % colors.length];
        const batch = pending.map((l) => ({ ...l, backgroundColor }));
        pending = [];
        setLogLines((lines) => [...batch, ...lines]);
      });
    }
    pending = [{ text, timestamp: new Date() }, ...pending];
  };
  const without = (id: string) => (list: string[]) => list.filter((x) => x !== id);

  // No unsubscribe needed: <Dockview> disposes the api, and its emitters with it, on unmount
  const onReady = (dockApi: DockviewApi) => {
    setApi(() => dockApi);
    addLogLine("Dockview Is Ready");
    dockApi.onDidAddPanel((e) => { setPanels((p) => [...p, e.id]); addLogLine(`Panel Added ${e.id}`); });
    dockApi.onDidActivePanelChange((e) => { setActivePanel(e.panel?.id); addLogLine(`Panel Activated ${e.panel?.id}`); });
    dockApi.onDidRemovePanel((e) => { setPanels(without(e.id)); addLogLine(`Panel Removed ${e.id}`); });
    dockApi.onDidAddGroup((e) => { setGroups((g) => [...g, e.id]); addLogLine(`Group Added ${e.id}`); });
    dockApi.onDidRemoveGroup((e) => { setGroups(without(e.id)); addLogLine(`Group Removed ${e.id}`); });
    dockApi.onDidActiveGroupChange((e) => { setActiveGroup(e?.id); addLogLine(`Group Activated ${e?.id}`); });
    if (!loadSaved(dockApi)) defaultConfig(dockApi);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        "flex-direction": "column",
        "flex-grow": 1,
        padding: "8px",
        "box-sizing": "border-box",
        "background-color": "rgba(0,0,50,0.25)",
        "border-radius": "8px",
      }}
    >
      <div>
        <GridActions api={api()} />
        <PanelActions api={api()} panels={panels()} activePanel={activePanel()} />
        <GroupActions api={api()} groups={groups()} activeGroup={activeGroup()} />
      </div>
      <div style={{ "flex-grow": 1, overflow: "hidden", height: 0, display: "flex" }}>
        <Dockview
          components={components}
          leftHeaderActions={LeftControls}
          rightHeaderActions={RightControls}
          prefixHeaderActions={PrefixHeaderControls}
          onReady={onReady}
          options={{
            theme: themeAbyss,
            getTabContextMenuItems: () => ["close", "closeOthers", "closeAll", "separator", { component: FloatMenuItem }],
          }}
        />
        <div data-testid="log" style={{ width: "300px", "flex-shrink": 0, "background-color": "black", color: "white", overflow: "auto" }}>
          <LogLines lines={logLines()} />
        </div>
      </div>
    </div>
  );
}
