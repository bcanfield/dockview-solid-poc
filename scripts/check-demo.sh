#!/bin/bash
# Drives the dockview + Solid demo in agent-browser with real clicks and prints PASS/FAIL per behaviour.
export AGENT_BROWSER_SESSION=dockview-solid-poc
ev(){ agent-browser eval "$1" 2>&1 | tail -1 | sed 's/^"//; s/"$//; s/\\"/"/g'; }
# tag an element found by JS, then click it with a real browser click
clk(){ ev "(() => { document.querySelectorAll('[data-t]').forEach(e=>e.removeAttribute('data-t')); const el = ($1); if(!el) return 'missing'; el.setAttribute('data-t','x'); return 'ok' })()" >/dev/null; agent-browser click "[data-t=x]" >/dev/null 2>&1; agent-browser wait 250 >/dev/null 2>&1; }
check(){ if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1  (got: $2, want: $3)"; fi; }
TABS="document.querySelectorAll('.dv-tab').length"
ICON="(name) => [...document.querySelectorAll('.group-control .material-symbols-outlined')].filter(s=>s.textContent===name)"
LOG0="document.querySelector('[data-testid=log]').firstElementChild.textContent"

agent-browser close >/dev/null 2>&1; agent-browser set viewport 1440 900 >/dev/null 2>&1
agent-browser open http://localhost:4318/ >/dev/null 2>&1; agent-browser wait 1500 >/dev/null 2>&1
ev "localStorage.clear()" >/dev/null; agent-browser reload >/dev/null 2>&1; agent-browser wait 1500 >/dev/null 2>&1

check "initial: 8 tabs" "$(ev "$TABS")" 8
check "initial: 5 groups" "$(ev "document.querySelectorAll('.dv-groupview').length")" 5
check "initial: titles drawn in panels" "$(ev "[...document.querySelectorAll('span[style*=\"42px\"]')].every(s=>s.textContent.startsWith('Panel'))")" true
check "right header: one star (active group only)" "$(ev "($ICON)('star').length")" 1
check "right header: file_download while panel_1 active" "$(ev "($ICON)('file_download').length")" 1

clk "document.querySelectorAll('.group-control .material-symbols-outlined')[1].closest('.action')"   # first group's '+'
check "left header '+': adds a tab" "$(ev "$TABS")" 9
check "left header '+': new tab titled 'Tab 1'" "$(ev "[...document.querySelectorAll('.dv-tab')].some(t=>t.textContent.trim()==='Tab 1')")" true
check "log: newest line is panel activation" "$(ev "/Panel (Added|Activated) id_/.test($LOG0)")" true
check "file_download hidden once panel_1 not active" "$(ev "($ICON)('file_download').length")" 0

clk "[...document.querySelectorAll('.dv-tab')].find(t=>t.textContent.trim()==='Panel 6')"
check "clicking Panel 6 moves the star to its group" "$(ev "($ICON)('star')[0]?.closest('.dv-groupview')?.contains([...document.querySelectorAll('.dv-tab')].find(t=>t.textContent.trim()==='Panel 6'))")" true
check "group buttons: active group highlighted" "$(ev "document.querySelectorAll('.demo-button.selected').length")" 2

clk "($ICON)('expand_content').find(s=>s.closest('.dv-groupview').querySelector('.dv-tab')?.textContent.trim()==='Panel 6')?.closest('.action')"
VIS="[...document.querySelectorAll('.dv-groupview')].filter(g=>{const r=g.getBoundingClientRect(); return r.width>0&&r.height>0})"
check "maximize: Panel 6 group's icon flips to collapse_content" "$(ev "$VIS.map(g=>[...g.querySelectorAll('.group-control .material-symbols-outlined')].map(s=>s.textContent).includes('collapse_content')).join()")" true
check "maximize: only the Panel 6 group visible" "$(ev "$VIS.map(g=>g.querySelector('.dv-tab').textContent.trim()).join()")" "Panel 6"
clk "$VIS[0].querySelector('.group-control [title=\"Minimize View\"]')"
check "restore: 5 groups visible again" "$(ev "$VIS.length")" 5

ev "(() => { const t=[...document.querySelectorAll('.dv-tab')].find(t=>t.textContent.trim()==='Panel 2'); const r=t.getBoundingClientRect(); t.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.x+5,clientY:r.y+5})); return 1 })()" >/dev/null; agent-browser wait 300 >/dev/null 2>&1
check "context menu: Solid 'Float tab' item rendered" "$(ev "[...document.querySelectorAll('.dv-context-menu-item')].some(i=>i.textContent.includes('Float tab'))")" true
clk "[...document.querySelectorAll('.dv-context-menu-item')].find(i=>i.textContent.includes('Float tab'))"
check "context menu: Float tab made a floating group" "$(ev "document.querySelectorAll('.dv-resize-container').length")" 1
check "context menu: closed after click" "$(ev "[...document.querySelectorAll('.dv-context-menu-item')].length")" 0

clk "[...document.querySelectorAll('.button-action')].find(b=>b.querySelector('.demo-button')?.textContent==='panel_3').querySelectorAll('.demo-icon-button')[2]"
check "panel actions: close panel_3 removes its tab" "$(ev "[...document.querySelectorAll('.dv-tab')].some(t=>t.textContent.trim()==='Panel 3')")" false
check "panel actions: panel_3 button gone" "$(ev "[...document.querySelectorAll('.demo-button')].some(b=>b.textContent==='panel_3')")" false
check "log: 'Panel Removed panel_3' logged" "$(ev "[...document.querySelector('[data-testid=log]').children].some(c=>c.textContent.includes('Panel Removed panel_3'))")" true

clk "[...document.querySelectorAll('.demo-button')].find(b=>b.textContent==='panel_5')"
check "panel actions: focusing panel_5 selects it" "$(ev "[...document.querySelectorAll('.demo-button.selected')].some(b=>b.textContent==='panel_5')")" true

BEFORE=$(ev "$TABS")
clk "[...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()==='Save')"
clk "[...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()==='Clear')"
check "Clear: no tabs" "$(ev "$TABS")" 0
check "Clear: panel buttons emptied" "$(ev "document.querySelectorAll('.demo-button').length")" 0
clk "[...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()==='Load')"
check "Load: saved layout restored ($BEFORE tabs)" "$(ev "$TABS")" "$BEFORE"
check "Load: restored panels show titles" "$(ev "[...document.querySelectorAll('span[style*=\"42px\"]')].filter(s=>s.offsetParent).every(s=>s.textContent.length>0)")" true
clk "[...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()==='Reset')"
check "Reset: back to 8 tabs" "$(ev "$TABS")" 8
clk "[...document.querySelectorAll('.text-button')].find(b=>b.textContent.trim()==='Add Panel')"
check "Add Panel: 9 tabs" "$(ev "$TABS")" 9

echo "--- console errors/warnings:"; agent-browser console 2>&1 | grep -v "vite\]" ; agent-browser errors 2>&1
