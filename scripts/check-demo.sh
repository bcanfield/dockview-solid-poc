#!/bin/bash
# Drives the demo in agent-browser with real clicks and prints PASS/FAIL per behaviour.
# Start the app first (`pnpm dev`); override the address with DEMO_URL. Exits 1 on any FAIL or console error.
URL="${DEMO_URL:-http://localhost:5173/}"
export AGENT_BROWSER_SESSION=dockview-solid-poc
FAILS=0
ev(){ agent-browser eval "$1" 2>&1 | tail -1 | sed 's/^"//; s/"$//; s/\\"/"/g'; }
check(){ if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (got: $2, want: $3)"; FAILS=$((FAILS+1)); fi; }
# Tag the element a JS expression finds, then click it with a real browser click
clk(){
  local r; r=$(ev "(() => { document.querySelectorAll('[data-t]').forEach(e=>e.removeAttribute('data-t')); const el = ($1); if(!el) return 'missing'; el.setAttribute('data-t','x'); return 'ok' })()")
  if [ "$r" != "ok" ]; then echo "FAIL  click target not found: $1"; FAILS=$((FAILS+1)); return; fi
  agent-browser click "[data-t=x]" >/dev/null 2>&1; agent-browser wait 250 >/dev/null 2>&1
}
reload(){ agent-browser reload >/dev/null 2>&1; agent-browser wait 1500 >/dev/null 2>&1; }
TABS="document.querySelectorAll('.dv-tab').length"
NGROUPS="document.querySelectorAll('.dv-groupview').length"
ICON="(name) => [...document.querySelectorAll('.group-control .material-symbols-outlined')].filter(s=>s.textContent===name)"
TITLES="[...document.querySelectorAll('[data-testid=panel-title]')].filter(s=>s.offsetParent)"
VIS="[...document.querySelectorAll('.dv-groupview')].filter(g=>{const r=g.getBoundingClientRect(); return r.width>0&&r.height>0})"
LOG="[...document.querySelector('[data-testid=log]').children]"
BUTTON="(text) => [...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()===text)"
TAB="(title) => [...document.querySelectorAll('.dv-tab')].find(t=>t.textContent.trim()===title)"

agent-browser close >/dev/null 2>&1; agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open "$URL" >/dev/null 2>&1; agent-browser wait 1500 >/dev/null 2>&1
ev "localStorage.clear()" >/dev/null; reload

check "initial: 8 tabs" "$(ev "$TABS")" 8
check "initial: 5 groups" "$(ev "$NGROUPS")" 5
check "initial: each visible panel draws its title" "$(ev "$TITLES.map(s=>s.textContent).sort().join()")" "Panel 1,Panel 5,Panel 6,Panel 7,Panel 8"
check "log: lines from one tick share a colour" "$(ev "new Set($LOG.map(c=>c.style.backgroundColor)).size")" 1
check "right header: one star (active group only)" "$(ev "($ICON)('star').length")" 1
check "right header: file_download while panel_1 active" "$(ev "($ICON)('file_download').length")" 1

clk "($ICON)('add')[0].closest('.action')"
check "left header '+': adds a tab" "$(ev "$TABS")" 9
check "left header '+': new tab titled 'Tab 1'" "$(ev "!!($TAB)('Tab 1')")" true
check "log: a new tick gets a new colour" "$(ev "$LOG[0].style.backgroundColor !== $LOG.at(-1).style.backgroundColor")" true
check "file_download hidden once panel_1 not active" "$(ev "($ICON)('file_download').length")" 0

clk "($TAB)('Panel 6')"
check "clicking Panel 6 moves the star to its group" "$(ev "($ICON)('star')[0]?.closest('.dv-groupview')?.contains(($TAB)('Panel 6'))")" true
check "action bars: active panel and group highlighted" "$(ev "document.querySelectorAll('.demo-button.selected').length")" 2

clk "($TAB)('Panel 6').closest('.dv-groupview').querySelector('.group-control [title=\"Maximize View\"]')"
check "header maximize: icon flips to collapse_content" "$(ev "$VIS.map(g=>!!g.querySelector('[title=\"Minimize View\"]')).join()")" true
check "header maximize: only the Panel 6 group visible" "$(ev "$VIS.map(g=>g.querySelector('.dv-tab').textContent.trim()).join()")" "Panel 6"
clk "$VIS[0].querySelector('.group-control [title=\"Minimize View\"]')"
check "header restore: 5 groups visible again" "$(ev "$VIS.length")" 5

ev "(() => { const t=($TAB)('Panel 2'); const r=t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.x+5,clientY:r.y+5})); return 1 })()" >/dev/null; agent-browser wait 300 >/dev/null 2>&1
check "context menu: Solid 'Float tab' item rendered" "$(ev "[...document.querySelectorAll('.dv-context-menu-item')].some(i=>i.textContent.includes('Float tab'))")" true
clk "[...document.querySelectorAll('.dv-context-menu-item')].find(i=>i.textContent.includes('Float tab'))"
check "context menu: Float tab made a floating group" "$(ev "document.querySelectorAll('.dv-resize-container').length")" 1
check "context menu: closed after click" "$(ev "document.querySelectorAll('.dv-context-menu-item').length")" 0

PANEL_ACTION="(id, i) => [...document.querySelectorAll('.button-action')].find(b=>b.querySelector('.demo-button')?.textContent===id).querySelectorAll('.demo-icon-button')[i]"
clk "($PANEL_ACTION)('panel_3', 2)"
check "panel bar close: panel_3's tab gone" "$(ev "!!($TAB)('Panel 3')")" false
check "panel bar close: panel_3 button gone" "$(ev "[...document.querySelectorAll('.demo-button')].some(b=>b.textContent==='panel_3')")" false
check "log: 'Panel Removed panel_3' logged" "$(ev "$LOG.some(c=>c.textContent.includes('Panel Removed panel_3'))")" true
clk "[...document.querySelectorAll('.demo-button')].find(b=>b.textContent==='panel_5')"
check "panel bar focus: panel_5 selected" "$(ev "[...document.querySelectorAll('.demo-button.selected')].some(b=>b.textContent==='panel_5')")" true
FLOATS_BEFORE=$(ev "document.querySelectorAll('.dv-resize-container').length")
clk "($PANEL_ACTION)('panel_7', 0)"
check "panel bar float: panel_7 floated" "$(ev "document.querySelectorAll('.dv-resize-container').length")" $((FLOATS_BEFORE+1))

# The glue's title path: api.setTitle must reach the Solid panel through onDidTitleChange
ev "dockviewApi.getPanel('panel_5').api.setTitle('Renamed 5')" >/dev/null; agent-browser wait 200 >/dev/null 2>&1
check "setTitle: panel content shows the new title" "$(ev "$TITLES.some(s=>s.textContent==='Renamed 5')")" true

clk "($TAB)('Panel 8')"
# The highlighted numeric button in the group bar is the active group: Panel 8's
G8_ID=$(ev "[...document.querySelectorAll('.demo-button.selected')].map(b=>b.textContent).find(t=>!isNaN(t))")
GROUP_ACTION="(i) => [...document.querySelectorAll('.button-action')].find(b=>b.querySelector('.demo-button')?.textContent==='$G8_ID').querySelectorAll('.demo-icon-button')[i]"
clk "($GROUP_ACTION)(2)"
# Grid groups only: the floating group from the context-menu step stays on screen, as dockview intends
check "group bar maximize: only Panel 8's grid group visible" "$(ev "$VIS.filter(g=>!g.closest('.dv-resize-container')).map(g=>g.querySelector('.dv-tab').textContent.trim()).join()")" "Panel 8"
clk "($GROUP_ACTION)(2)"
check "group bar maximize again: restored" "$(ev "$VIS.filter(g=>!g.closest('.dv-resize-container')).length>1")" true
NGROUPS_BEFORE=$(ev "$NGROUPS")
clk "($GROUP_ACTION)(3)"
check "group bar close: one group fewer" "$(ev "$NGROUPS")" $((NGROUPS_BEFORE-1))
clk "($BUTTON)('Add Group')"
check "Add Group: one group more" "$(ev "$NGROUPS")" "$NGROUPS_BEFORE"

BEFORE=$(ev "$TABS")
clk "($BUTTON)('Save')"
clk "($BUTTON)('Clear')"
check "Clear: no tabs" "$(ev "$TABS")" 0
check "Clear: panel buttons emptied" "$(ev "[...document.querySelectorAll('.demo-button')].filter(b=>b.textContent.startsWith('panel')||b.textContent.startsWith('id_')).length")" 0
clk "($BUTTON)('Load')"
check "Load: saved layout restored ($BEFORE tabs)" "$(ev "$TABS")" "$BEFORE"
check "Load: restored panels draw titles" "$(ev "$TITLES.length>0 && $TITLES.every(s=>s.textContent.length>0)")" true
reload
check "reload: saved layout restored from localStorage" "$(ev "$TABS")" "$BEFORE"
clk "($BUTTON)('Reset')"
check "Reset: back to 8 tabs" "$(ev "$TABS")" 8
clk "($BUTTON)('Add Panel')"
check "Add Panel: 9 tabs" "$(ev "$TABS")" 9

clk "($BUTTON)('Reset')"
MAIN=$(agent-browser tab list 2>&1 | grep '→' | grep -o 't[0-9]*' | head -1)
clk "($TAB)('Panel 6').closest('.dv-groupview').querySelector('[title=\"Open In New Window\"]')"
agent-browser wait 1500 >/dev/null 2>&1
POP=$(agent-browser tab list 2>&1 | grep -o '\[t[0-9]*\][^\[]*popout.html' | grep -o 't[0-9]*' | head -1)
check "popout: window opened" "$([ -n "$POP" ] && echo yes)" yes
if [ -n "$POP" ]; then
  agent-browser tab "$POP" >/dev/null 2>&1
  check "popout: holds only the group, app not booted" "$(ev "[...document.querySelectorAll('.dv-tab')].map(t=>t.textContent.trim()).join() + '|' + !!document.querySelector('.text-button')")" "Panel 6|false"
  clk "($ICON)('add')[0].closest('.action')"
  check "popout: Solid '+' click works inside the popout" "$(ev "$TABS")" 2
  # Read the popout's console before Close Window shuts it
  POP_ERRS=$(agent-browser console 2>&1 | grep -iE '^\[(error|warning)\]')
  check "popout: no console errors or warnings" "${POP_ERRS:-none}" none
  clk "document.querySelector('[title=\"Close Window\"]')"
  agent-browser tab "$MAIN" >/dev/null 2>&1; agent-browser wait 500 >/dev/null 2>&1
  check "popout: Close Window moves the group back (8 + 1 added in popout)" "$(ev "!!($TAB)('Panel 6') && $TABS")" 9
fi

ev "localStorage.clear()" >/dev/null
ERRS=$( (agent-browser console 2>&1 | grep -iE '^\[(error|warning)\]'; agent-browser errors 2>&1 | grep -v '^\s*$') )
check "no console errors or warnings" "${ERRS:-none}" none
agent-browser close >/dev/null 2>&1
[ "$FAILS" -eq 0 ] && echo "ALL PASS" || { echo "$FAILS FAILED"; exit 1; }
