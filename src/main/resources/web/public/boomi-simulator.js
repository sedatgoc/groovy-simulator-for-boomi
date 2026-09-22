/* ════ THEME ════ */
var currentTheme = localStorage.getItem('boomi_theme') || 'dark';

// Apply before editors init to avoid flash
document.documentElement.setAttribute('data-theme', currentTheme);

function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('boomi_theme', theme);
    var aceTheme = (theme === 'dark') ? 'ace/theme/one_dark' : 'ace/theme/chrome';
    if (payloadEditor) payloadEditor.setTheme(aceTheme);
    if (scriptEditor)  scriptEditor.setTheme(aceTheme);
    if (resultEditor)  resultEditor.setTheme(aceTheme);
}

window.toggleTheme = function () {
    console.log("test");
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

/* ════ EDITORS ════ */
function createEditor(id, mode) {
    var aceTheme = (currentTheme === 'dark') ? 'ace/theme/one_dark' : 'ace/theme/chrome';
    var ed = ace.edit(id);
    ed.setTheme(aceTheme);
    ed.session.setMode(mode);
    ed.setFontSize(12.5);
    ed.setShowPrintMargin(false);
    ed.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true,
        wrap: true
    });
    return ed;
}

var payloadEditor = createEditor('payloadEditor', 'ace/mode/json');
var scriptEditor  = createEditor('scriptEditor',  'ace/mode/groovy');
var resultEditor  = createEditor('resultEditor',  'ace/mode/json');
resultEditor.setReadOnly(false);

/* ════ RUNTIME ════ */
var runtime = 'groovy';
window.changeRuntime = function () {
    runtime = document.getElementById('changeRuntime').value;
    document.getElementById('langBadge').textContent = runtime.toUpperCase();
    scriptEditor.session.setMode(runtime === 'groovy' ? 'ace/mode/groovy' : 'ace/mode/javascript');
}

/* ════ MODE DETECT ════ */
payloadEditor.on('input', function() {
    detectAndSetMode(payloadEditor, payloadEditor.getValue().trim(), 'payloadMode');
});

function detectAndSetMode(editor, content, selectId) {
    var mode = 'ace/mode/text';
    if (content.startsWith('{') || content.startsWith('[')) mode = 'ace/mode/json';
    else if (content.startsWith('<')) mode = 'ace/mode/xml';
    editor.session.setMode(mode);
    document.getElementById(selectId).value = mode;
}

function changeEditorMode(editor, mode) { editor.session.setMode(mode); }

/* ════ FORMAT / COPY ════ */
function formatEditor(editor) {
    var content = editor.getValue();
    var mode = editor.session.getMode().$id;
    try {
        if (mode === 'ace/mode/json') {
            editor.setValue(JSON.stringify(JSON.parse(content), null, 4), -1);
        } else if (mode === 'ace/mode/xml') {
            var formatted = '', indent = '';
            content.split(/>\s*</).forEach(function(node) {
                if (node.match(/^\/\w/)) indent = indent.substring(2);
                formatted += indent + '<' + node + '>\r\n';
                if (node.match(/^<?\w[^>]*[^\/]$/)) indent += '  ';
            });
            editor.setValue(formatted.substring(1, formatted.length - 3), -1);
        }
    } catch(e) {}
}

function copyToClipboard(editor) {
    navigator.clipboard.writeText(editor.getValue()).then(function() {
        var btn = document.getElementById('copyBtn');
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function() { btn.textContent = orig; }, 1500);
    });
}

/* Ctrl+Enter shortcut */
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeScript();
    }
});

/* ════ PROPERTIES ════ */
function addPropertyRow(key, val) {
    key = key || '';
    val = val || '';
    var tbody = document.querySelector('#propsTable tbody');
    var row = tbody.insertRow();
    row.innerHTML = buildRowHtml(key, val);
    var w = document.getElementById('propsWrapper');
    w.scrollTop = w.scrollHeight;
    if (!key) row.querySelector('.p-key').focus();
}

function addDynamicProcessPropertyRow(key, val) {
    key = key || '';
    val = val || '';
    var tbody = document.querySelector('#dynamicProcessPropertyTable tbody');
    var row = tbody.insertRow();
    row.innerHTML = buildRowHtml(key, val);
    var w = document.getElementById('dppWrapper');
    w.scrollTop = w.scrollHeight;
    if (!key) row.querySelector('.p-key').focus();
}

function buildRowHtml(k, v) {
    return '<td><input type="text" class="p-key" value="' + escHtml(k) + '" placeholder="property.key"></td>' +
           '<td><textarea class="p-val-area">' + escHtml(v) + '</textarea></td>' +
           '<td><button class="delete-btn" onclick="this.closest(\'tr\').remove()">x</button></td>';
}

/* ════ CACHE ════ */
window.onload = function() {
    applyTheme(localStorage.getItem('boomi_theme') || 'dark');
    try {
        if (localStorage.getItem('boomi_payload')) {
            payloadEditor.setValue(localStorage.getItem('boomi_payload'), -1);
            detectAndSetMode(payloadEditor, payloadEditor.getValue().trim(), 'payloadMode');
        }
        if (localStorage.getItem('boomi_script')) {
            scriptEditor.setValue(localStorage.getItem('boomi_script'), -1);
        }
        if (localStorage.getItem('boomi_props')) {
            Object.entries(JSON.parse(localStorage.getItem('boomi_props'))).forEach(function(e) {
                addPropertyRow(e[0], e[1]);
            });
        }
        if (localStorage.getItem('boomi_dynamicProcessProps')) {
            Object.entries(JSON.parse(localStorage.getItem('boomi_dynamicProcessProps'))).forEach(function(e) {
                addDynamicProcessPropertyRow(e[0], e[1]);
            });
        }
    } catch(e) {}
};

function saveToCache(payload, script, props, dpp) {
    localStorage.setItem('boomi_payload', payload);
    localStorage.setItem('boomi_script', script);
    localStorage.setItem('boomi_props', JSON.stringify(props));
    localStorage.setItem('boomi_dynamicProcessProps', JSON.stringify(dpp));
}

/* ════ LOGS ════ */
function filterLogs() {
    var v = document.getElementById('logFilter').value;
    var t = document.getElementById('terminalOutput');
    t.classList.remove('filter-info', 'filter-warn', 'filter-error', 'filter-print');
    if (v === 'log-info')  t.classList.add('filter-info');
    if (v === 'log-warn')  t.classList.add('filter-warn');
    if (v === 'log-error') t.classList.add('filter-error');
    if (v === 'log-print') t.classList.add('filter-print');
}

function updateTerminal(logText) {
    var terminal = document.getElementById('terminalOutput');
    terminal.innerHTML = '';
    if (!logText || !logText.trim()) {
        terminal.innerHTML = '<span class="log-line log-print">// No logs returned.</span>';
        return;
    }
    var lines = logText.split('\n');
    var html = '';
    var lastCls = '';
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim() && i === lines.length - 1) continue;
        var cls = '';
        if      (line.indexOf('[INFO]')    !== -1) { cls = 'log-info';  lastCls = cls; }
        else if (line.indexOf('[WARNING]') !== -1) { cls = 'log-warn';  lastCls = cls; }
        else if (line.indexOf('[SEVERE]')  !== -1 || line.indexOf('[ERROR]') !== -1) { cls = 'log-error'; lastCls = cls; }
        else if (line.indexOf('[PRINT]')   !== -1) { cls = 'log-print'; lastCls = cls; }
        else if (lastCls) cls = lastCls;
        else cls = 'log-print';
        html += '<span class="log-line ' + cls + '">' + escapeHtml(line) + '</span>';
    }
    terminal.innerHTML = html;
    filterLogs();
    terminal.scrollTop = terminal.scrollHeight;
}

/* ════ DOCUMENT PROPERTY PREFIX ════ */
// Boomi keys user-defined document properties under this namespace. The UI
// lets users type just the short name; the wire format uses the full key.
var DOC_PROP_PREFIX = 'document.dynamic.userdefined.';

function withDocPrefix(map) {
    var out = {};
    Object.keys(map).forEach(function(k) {
        var key = k.indexOf(DOC_PROP_PREFIX) === 0 ? k : DOC_PROP_PREFIX + k;
        out[key] = map[k];
    });
    return out;
}

function stripDocPrefix(map) {
    if (!map || typeof map !== 'object') return map;
    var out = {};
    Object.keys(map).forEach(function(k) {
        var key = k.indexOf(DOC_PROP_PREFIX) === 0 ? k.slice(DOC_PROP_PREFIX.length) : k;
        out[key] = map[k];
    });
    return out;
}

/* ════ RESULT PAGINATION ════ */
var resultPayloads = [];
var resultProps = [];
var resultIndex = 0;

function showResult(idx) {
    if (!resultPayloads.length) return;
    if (idx < 0) idx = 0;
    if (idx > resultPayloads.length - 1) idx = resultPayloads.length - 1;
    resultIndex = idx;

    var payload = resultPayloads[idx] || '';
    resultEditor.setValue(payload, -1);
    detectAndSetMode(resultEditor, payload.trim(), 'resultMode');
    formatEditor(resultEditor);
    renderOutputList('outPropList', stripDocPrefix(resultProps[idx]), 'no properties returned');
    updatePagerUi();
}

function updatePagerUi() {
    var pager = document.getElementById('resultPager');
    var total = resultPayloads.length;
    if (total <= 1) {
        pager.hidden = true;
        return;
    }
    pager.hidden = false;
    document.getElementById('pagerInfo').textContent = (resultIndex + 1) + ' / ' + total;
    document.getElementById('pagerPrev').disabled = resultIndex === 0;
    document.getElementById('pagerNext').disabled = resultIndex === total - 1;
}

/* ════ OUTPUT LISTS ════ */
function renderOutputList(listId, data, emptyMsg) {
    var list = document.getElementById(listId);
    list.innerHTML = '';
    if (data && typeof data === 'object' && Object.keys(data).length) {
        Object.entries(data).forEach(function(e) {
            var li  = document.createElement('li');
            var k   = document.createElement('span');
            k.className = 'output-key';
            k.textContent = e[0] + ':';
            var v   = document.createElement('span');
            v.className = 'output-val';
            v.textContent = e[1];
            li.appendChild(k);
            li.appendChild(v);
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li class="empty-state">// ' + emptyMsg + '</li>';
    }
}

/* ════ PROGRESS ════ */
var progressPhases = [
    { id: 'ps-1', label: 'Compiling script...' },
    { id: 'ps-2', label: 'Executing on runtime...' },
    { id: 'ps-3', label: 'Parsing response...' },
    { id: 'ps-4', label: 'Complete!' }
];
var progressTimer = null;

function showProgress() {
    document.getElementById('progress-overlay').classList.add('active');
    progressPhases.forEach(function(p) {
        var el = document.getElementById(p.id);
        el.classList.remove('active', 'done');
    });
    document.getElementById('progressFill').classList.add('indeterminate');
    setProgressStep(0);
    var step = 0;
    progressTimer = setInterval(function() {
        step++;
        if (step < progressPhases.length - 1) setProgressStep(step);
    }, 900);
    setStatus('RUNNING', 'running');
    document.getElementById('runBtn').classList.add('running');
}

function setProgressStep(idx) {
    if (idx > 0) {
        var prev = document.getElementById(progressPhases[idx - 1].id);
        prev.classList.remove('active');
        prev.classList.add('done');
    }
    document.getElementById(progressPhases[idx].id).classList.add('active');
    document.getElementById('progress-phase').textContent = progressPhases[idx].label;
}

function hideProgress(success) {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    progressPhases.forEach(function(p) {
        var el = document.getElementById(p.id);
        el.classList.remove('active');
        el.classList.add('done');
    });
    var fill = document.getElementById('progressFill');
    fill.classList.remove('indeterminate');
    fill.style.width = '100%';
    document.getElementById('progress-phase').textContent = success ? 'Execution complete!' : 'Error occurred.';
    setTimeout(function() {
        document.getElementById('progress-overlay').classList.remove('active');
        fill.style.width = '0%';
    }, 700);
    document.getElementById('runBtn').classList.remove('running');
    if (success) {
        setStatus('READY', 'ready');
    } else {
        setStatus('ERROR', 'error');
        setTimeout(function() { setStatus('READY', 'ready'); }, 3000);
    }
}

function setStatus(label, state) {
    var pill = document.getElementById('statusPill');
    var txt  = document.getElementById('statusText');
    pill.classList.remove('state-ready', 'state-running', 'state-error');
    pill.classList.add('state-' + state);
    txt.textContent = label;
}

/* ════ EXECUTE ════ */
async function executeScript() {
    var btn = document.getElementById('runBtn');
    btn.disabled = true;
    var payloadValue = payloadEditor.getValue();
    var scriptValue  = scriptEditor.getValue();
    var propsMap = {};
    var dppMap   = {};

    document.querySelectorAll('#propsTable tbody tr').forEach(function(row) {
        var k = row.querySelector('.p-key').value;
        var v = row.querySelector('.p-val-area').value;
        if (k) propsMap[k] = v;
    });
    document.querySelectorAll('#dynamicProcessPropertyTable tbody tr').forEach(function(row) {
        var k = row.querySelector('.p-key').value;
        var v = row.querySelector('.p-val-area').value;
        if (k) dppMap[k] = v;
    });

    saveToCache(payloadValue, scriptValue, propsMap, dppMap);
    showProgress();

    var encodedScript = btoa(unescape(encodeURIComponent(scriptValue)));
    try {
        var response = await fetch('/boomi/' + runtime, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payload: payloadValue,
                script: encodedScript,
                props: withDocPrefix(propsMap),
                dynamicProcessProperty: dppMap
            })
        });
        var data = await response.json();
        setProgressStep(2);
        await new Promise(function(r) { setTimeout(r, 300); });
        resultPayloads = Array.isArray(data.results) && data.results.length ? data.results : [''];
        resultProps    = Array.isArray(data.outputPropsList) ? data.outputPropsList : [];
        resultIndex    = 0;
        showResult(0);
        updateTerminal(data.logs || 'No logs.');
        renderOutputList('dynamicProcessPropertyList', data.dynamicProcessProperty, 'no properties returned');
        hideProgress(true);
    } catch (error) {
        document.getElementById('terminalOutput').innerHTML =
            '<span class="log-line log-error">[ERROR] ' + escapeHtml(error.message) + '</span>';
        hideProgress(false);
    } finally {
        btn.disabled = false;
    }
}

/* ════ HELPERS ════ */
function escapeHtml(t) {
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}
function escHtml(t) {
    return String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}