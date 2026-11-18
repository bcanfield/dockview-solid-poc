// Ported from dockview's demo-dockview template: gridActions, panelActions, groupActions and logLines.
import { For } from "solid-js";
import type { DockviewApi, DockviewGroupPanel } from "dockview-core";
import { defaultConfig, nextId } from "./defaultLayout";

const STORAGE_KEY = "dv-demo-state";

export function loadSaved(api: DockviewApi): boolean {
  try {
    const state = localStorage.getItem(STORAGE_KEY);
    if (!state) return false;
    api.fromJSON(JSON.parse(state));
    return true;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return false;
  }
}

export const GridActions = (props: { api?: DockviewApi }) => (
  <div class="action-container">
    <button class="text-button" onClick={() => props.api?.addPanel({ id: `id_${Date.now().toString()}`, component: "default", title: `Tab ${nextId()}` })}>
      Add Panel
    </button>
    <button class="text-button" onClick={() => props.api?.addGroup()}>Add Group</button>
    <button class="text-button" onClick={() => props.api?.clear()}>Clear</button>
    <button class="text-button" onClick={() => props.api && loadSaved(props.api)}>Load</button>
    <button
      class="text-button"
      onClick={() => {
        try { if (props.api) localStorage.setItem(STORAGE_KEY, JSON.stringify(props.api.toJSON())); } catch {}
      }}
    >
      Save
    </button>
    <button class="text-button" onClick={() => { if (props.api) { props.api.clear(); defaultConfig(props.api); } }}>
      Reset
    </button>
  </div>
);

const IconButton = (props: { icon: string; onClick: () => void }) => (
  <button class="demo-icon-button" onClick={props.onClick}>
    <span class="material-symbols-outlined">{props.icon}</span>
  </button>
);

export const PanelActions = (props: { panels: string[]; api?: DockviewApi; activePanel?: string }) => (
  <div class="action-container">
    <For each={props.panels}>
      {(id) => {
        const panel = () => props.api?.getPanel(id);
        return (
          <div class="button-action">
            <div style={{ display: "flex" }}>
              <button class={props.activePanel === id ? "demo-button selected" : "demo-button"} onClick={() => panel()?.focus()}>
                {id}
              </button>
            </div>
            <div style={{ display: "flex" }}>
              <IconButton icon="ad_group" onClick={() => { const p = panel(); if (p) props.api?.addFloatingGroup(p, { width: 400, height: 300, position: { bottom: 50, right: 50 } }); }} />
              <IconButton icon="open_in_new" onClick={() => { const p = panel(); if (p) props.api?.addPopoutGroup(p); }} />
              <IconButton icon="close" onClick={() => panel()?.api.close()} />
            </div>
          </div>
        );
      }}
    </For>
  </div>
);

export const GroupActions = (props: { groups: string[]; api?: DockviewApi; activeGroup?: string }) => (
  <div class="action-container">
    <For each={props.groups}>
      {(id) => {
        const group = () => props.api?.getGroup(id) as DockviewGroupPanel | undefined; // getGroup is typed as the interface; the add* calls want the class it returns
        return (
          <div class="button-action">
            <div style={{ display: "flex" }}>
              <button class={props.activeGroup === id ? "demo-button selected" : "demo-button"} onClick={() => group()?.focus()}>
                {id}
              </button>
            </div>
            <div style={{ display: "flex" }}>
              <IconButton icon="ad_group" onClick={() => { const g = group(); if (g) props.api?.addFloatingGroup(g, { width: 400, height: 300, position: { bottom: 50, right: 50 } }); }} />
              <IconButton icon="open_in_new" onClick={() => { const g = group(); if (g) props.api?.addPopoutGroup(g); }} />
              <IconButton icon="fullscreen" onClick={() => { const g = group(); if (g?.api.isMaximized()) g.api.exitMaximized(); else g?.api.maximize(); }} />
              <IconButton icon="close" onClick={() => group()?.api.close()} />
            </div>
          </div>
        );
      }}
    </For>
  </div>
);

export type LogLine = { text: string; timestamp?: Date; backgroundColor?: string };

export const LogLines = (props: { lines: LogLine[] }) => (
  <For each={props.lines}>
    {(line, i) => (
      <div
        style={{
          height: "30px",
          overflow: "hidden",
          "text-overflow": "ellipsis",
          "white-space": "nowrap",
          "font-size": "13px",
          display: "flex",
          "align-items": "center",
          "background-color": line.backgroundColor,
        }}
      >
        <span style={{ display: "inline-block", width: "20px", color: "gray", "border-right": "1px solid gray", "margin-right": "4px", "padding-left": "2px", height: "100%" }}>
          {props.lines.length - i()}
        </span>
        <span>
          {line.timestamp && <span style={{ "font-size": "0.7em", padding: "0px 2px" }}>{line.timestamp.toISOString().substring(11, 23)}</span>}
          <span>{line.text}</span>
        </span>
      </div>
    )}
  </For>
);
