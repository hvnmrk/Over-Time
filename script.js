'use strict';

const $ = id => document.getElementById(id);
const DB_NAME = 'proofbook-local-v1';
const STORE_NAME = 'tracker';
const RECORD_KEY = 'current';

let dbPromise;
let entries = [];
let goal = 468;
let studentName = '';
let editingId = null;
let toastTimer;

function openDatabase() {
    if (!('indexedDB' in window)) {
        return Promise.reject(Error('This browser does not support local storage.'));
    }

    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    return dbPromise;
}

async function loadData() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly')
            .objectStore(STORE_NAME).get(RECORD_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveData(nextEntries = entries, nextGoal = goal, nextName = studentName) {
    const db = await openDatabase();

    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({
            entries: nextEntries,
            goal: nextGoal,
            studentName: nextName
        }, RECORD_KEY);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });

    entries = nextEntries;
    goal = nextGoal;
    studentName = nextName;
    updateStudentName();
}

function readJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function escapeHTML(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function xml(v) {
    return escapeHTML(v).replace(/\r/g, '');
}

function localDate(date = new Date()) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

function formatDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function fmt(n) {
    return Number(Number(n).toFixed(2)).toString();
}

function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3300);
}

function updateStudentName() {
    $('profileName').textContent = studentName || 'Student';
    $('profileAvatar').textContent = studentName
        ? studentName.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase()
        : 'S';
    $('studentName').value = studentName;
    $('hoursGoal').value = goal;
}

async function initialize() {
    try {
        let stored = await loadData();

        // Move data from the previous browser-account demo when possible.
        if (!stored) {
            const accounts = readJSON('proofbook-accounts-v2', []);
            const sessionEmail = sessionStorage.getItem('proofbook-session-v2');
            const oldAccount = accounts.find(a => a.email === sessionEmail)
                || (accounts.length === 1 ? accounts[0] : null);

            if (oldAccount) {
                const old = readJSON('proofbook-data-v2:' + oldAccount.email, {});
                stored = {
                    entries: Array.isArray(old.entries) ? old.entries : [],
                    goal: old.goal,
                    studentName: oldAccount.name
                };
                await saveData(
                    stored.entries,
                    Number(stored.goal) || 468,
                    stored.studentName || ''
                );
                toast('Your previous entries were moved into this tracker.');
            }
        }

        entries = Array.isArray(stored?.entries) ? stored.entries : [];
        goal = Number(stored?.goal) > 0 ? Number(stored.goal) : 468;
        studentName = typeof stored?.studentName === 'string'
            ? stored.studentName
            : '';

        updateStudentName();
        $('weekDate').value = localDate();
        render();
    } catch {
        toast('Local data could not be opened. Check browser storage settings.');
    }
}

function closeMenu() {
    $('sidebar').classList.remove('open');
    $('backdrop').hidden = true;
    $('menuButton').setAttribute('aria-expanded', 'false');
}

$('menuButton').addEventListener('click', () => {
    const open = $('sidebar').classList.toggle('open');
    $('backdrop').hidden = !open;
    $('menuButton').setAttribute('aria-expanded', String(open));
});
$('backdrop').addEventListener('click', closeMenu);

function switchPage(page) {
    if (!['overview', 'entries', 'reports', 'settings'].includes(page)) return;

    document.querySelectorAll('.page')
        .forEach(el => el.classList.toggle('active', el.id === page));
    document.querySelectorAll('.nav-link')
        .forEach(el => el.classList.toggle('active', el.dataset.page === page));

    $('pageTitle').textContent = ({
        overview: 'Overview',
        entries: 'Daily entries',
        reports: 'Weekly reports',
        settings: 'Settings'
    })[page];

    closeMenu();
    window.scrollTo(0, 0);
}

$('settingsForm').addEventListener('submit', async e => {
    e.preventDefault();

    const value = Number($('hoursGoal').value);
    const name = $('studentName').value.trim();
    if (!name || !Number.isFinite(value) || value < 1 || value > 10000) return;

    try {
        await saveData(entries, value, name);
        render();
        toast('Settings saved.');
    } catch {
        toast('Could not save settings. Check available device storage.');
    }
});

$('backupButton').addEventListener('click', () => {
    const backup = JSON.stringify({
        format: 'proofbook-backup-v1',
        savedAt: new Date().toISOString(),
        studentName,
        goal,
        entries
    });

    const url = URL.createObjectURL(
        new Blob([backup], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `Proofbook_Backup_${localDate()}.json`;
    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('Backup downloaded. Keep it somewhere safe.');
});

$('importBackup').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
        toast('Backup is too large.');
        return;
    }

    try {
        const backup = JSON.parse(await file.text());

        if (
            backup.format !== 'proofbook-backup-v1' ||
            !Array.isArray(backup.entries) ||
            backup.entries.length > 3000 ||
            typeof backup.studentName !== 'string' ||
            !Number.isFinite(backup.goal) ||
            backup.goal < 1 ||
            backup.goal > 10000
        ) {
            throw Error('Invalid backup format.');
        }

        const restored = backup.entries.map(item => {
            if (
                !item ||
                typeof item.task !== 'string' ||
                typeof item.description !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
                !/^\d{2}:\d{2}$/.test(item.timeIn) ||
                !/^\d{2}:\d{2}$/.test(item.timeOut) ||
                (item.image && !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(item.image))
            ) {
                throw Error('Backup contains an invalid entry.');
            }

            const hours = calculateHours(
                item.timeIn,
                item.timeOut,
                item.breakMinutes
            );
            if (hours === null) throw Error('Backup contains invalid working hours.');

            return {
                id: crypto.randomUUID(),
                createdAt: Number(item.createdAt) || Date.now(),
                date: item.date,
                task: item.task.slice(0, 120),
                description: item.description.slice(0, 2000),
                timeIn: item.timeIn,
                timeOut: item.timeOut,
                breakMinutes: Number(item.breakMinutes),
                hours,
                image: item.image || null
            };
        });

        if (!confirm(`Replace your current entries with ${restored.length} entries from this backup?`)) return;

        await saveData(
            restored,
            backup.goal,
            backup.studentName.trim().slice(0, 80)
        );
        render();
        toast('Backup imported.');
    } catch (error) {
        toast(
            error.message?.startsWith('Backup') ||
                error.message === 'Invalid backup format.'
                ? error.message
                : 'Could not import backup. Check the file and device storage.'
        );
    }
});

function calculateHours(start, end, breakValue) {
    if (!start || !end || breakValue === '') return null;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const duration = eh * 60 + em - sh * 60 - sm;
    const br = Number(breakValue);

    if (
        !Number.isFinite(duration) ||
        !Number.isFinite(br) ||
        duration <= 0 ||
        br < 0 ||
        br >= duration
    ) {
        return null;
    }

    return Math.round((duration - br) / 60 * 100) / 100;
}

function updatePreview() {
    const h = calculateHours(
        $('timeIn').value,
        $('timeOut').value,
        $('breakMinutes').value
    );
    $('hoursPreview').textContent = h === null
        ? 'Rendered hours: —'
        : `Rendered hours: ${fmt(h)} hrs`;
}

['timeIn', 'timeOut', 'breakMinutes']
    .forEach(id => $(id).addEventListener('input', updatePreview));

function sorted() {
    return [...entries].sort((a, b) =>
        b.date.localeCompare(a.date) || b.createdAt - a.createdAt
    );
}

function render() {
    const total = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
    const remaining = Math.max(0, goal - total);
    const percent = Math.min(100, Math.round(total / goal * 100));

    $('renderedHours').textContent = fmt(total);
    $('requiredHours').textContent = fmt(goal);
    $('entryCount').textContent = entries.length;
    $('remainingHours').textContent = `${fmt(remaining)} hours to go`;
    $('percentage').textContent = `${percent}%`;
    $('goalProgress').value = percent;
    $('progressRendered').textContent = `${fmt(total)} rendered`;
    $('progressRemaining').textContent = `${fmt(remaining)} remaining`;

    $('recentEntries').innerHTML = sorted().slice(0, 3).map(e => `
    <button class="recent-item" data-detail="${escapeHTML(e.id)}">
      <span>
        <strong>${escapeHTML(e.task)}</strong>
        <small>${formatDate(e.date)}</small>
      </span>
      <b>${fmt(e.hours)}h</b>
    </button>
  `).join('') || '<div class="empty">Your first work day starts here.</div>';

    renderEntries();
    renderReport();
}

function renderEntries() {
    const query = $('search').value.trim().toLowerCase();
    const filtered = sorted().filter(e =>
        [e.date, e.task, e.description]
            .join(' ')
            .toLowerCase()
            .includes(query)
    );

    $('entriesList').innerHTML = filtered.map(e => `
    <article class="entry-card">
      <div class="entry-top">
        <div>
          <h3>${escapeHTML(e.task)}</h3>
          <span class="entry-meta">
            ${formatDate(e.date)} · ${escapeHTML(e.timeIn)}–${escapeHTML(e.timeOut)}
            · ${fmt(e.hours)} hours
          </span>
        </div>
        <span aria-label="${e.image ? 'Image attached' : 'No image'}">
          ${e.image ? '📷' : ''}
        </span>
      </div>
      <p class="entry-description">${escapeHTML(e.description)}</p>
      <div class="entry-actions">
        <button data-detail="${escapeHTML(e.id)}">View details ↗</button>
        <button data-edit="${escapeHTML(e.id)}">Edit</button>
      </div>
    </article>
  `).join('') || `<div class="empty">${entries.length
            ? 'No entries match your search.'
            : 'No entries yet. Add your first day of work.'
        }</div>`;
}

$('search').addEventListener('input', renderEntries);

function openForm(id = null) {
    const e = entries.find(x => x.id === id);
    editingId = e?.id ?? null;
    $('entryForm').reset();
    $('formError').textContent = '';
    $('attachmentNote').textContent = e?.image
        ? 'Existing image will be kept unless you choose another.'
        : '';
    $('formTitle').textContent = e ? 'Edit entry' : 'New entry';
    $('entryDate').value = e?.date || localDate();
    $('breakMinutes').value = e?.breakMinutes ?? 60;
    $('task').value = e?.task || '';
    $('timeIn').value = e?.timeIn || '';
    $('timeOut').value = e?.timeOut || '';
    $('description').value = e?.description || '';
    updatePreview();
    $('entryDialog').showModal();
}

function fileData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(Error('Could not read image.'));
        reader.readAsDataURL(file);
    });
}

function normalizeImage(source) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(
                img, 0, 0, canvas.width, canvas.height
            );
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = () => reject(Error('Could not process image.'));
        img.src = source;
    });
}

$('entryForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('formError').textContent = '';

    const hours = calculateHours(
        $('timeIn').value,
        $('timeOut').value,
        $('breakMinutes').value
    );
    if (hours === null) {
        $('formError').textContent =
            'Time out must be later than time in, and the break must be shorter than the shift.';
        return;
    }

    const task = $('task').value.trim();
    const description = $('description').value.trim();
    if (!task || !description) {
        $('formError').textContent = 'Enter a task and short description.';
        return;
    }

    const file = $('evidence').files[0];
    if (
        file &&
        (
            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
            file.size > 2 * 1024 * 1024
        )
    ) {
        $('formError').textContent = 'Choose a PNG, JPG, or WebP image up to 2 MB.';
        return;
    }

    $('saveButton').disabled = true;

    try {
        const old = entries.find(x => x.id === editingId);
        const image = file
            ? await normalizeImage(await fileData(file))
            : old?.image || null;

        const record = {
            id: old?.id || crypto.randomUUID(),
            createdAt: old?.createdAt || Date.now(),
            date: $('entryDate').value,
            task,
            description,
            timeIn: $('timeIn').value,
            timeOut: $('timeOut').value,
            breakMinutes: Number($('breakMinutes').value),
            hours,
            image
        };

        const next = old
            ? entries.map(x => x.id === old.id ? record : x)
            : [record, ...entries];

        await saveData(next);
        $('entryDialog').close();
        render();
        toast(old ? 'Entry updated.' : 'Entry saved.');
    } catch (err) {
        $('formError').textContent = err.message || 'Could not save the entry.';
    } finally {
        $('saveButton').disabled = false;
    }
});

function openDetail(id) {
    const e = entries.find(x => x.id === id);
    if (!e) return;

    $('detailTitle').textContent = e.task;
    $('detailContent').innerHTML = `
    <p class="entry-meta">
      ${formatDate(e.date)} · ${escapeHTML(e.timeIn)}–${escapeHTML(e.timeOut)}
      · ${fmt(e.hours)} hours (${Number(e.breakMinutes)} minute break)
    </p>
    <h3>Short description</h3>
    <p class="detail-copy">${escapeHTML(e.description)}</p>
    <h3>Image</h3>
    ${e.image
            ? `<img class="detail-photo" alt="Evidence for ${escapeHTML(e.task)}" src="${e.image}">`
            : '<p class="muted">No image attached.</p>'}
    <div class="entry-actions">
      <button data-edit="${escapeHTML(e.id)}">Edit entry</button>
      <button class="danger" data-delete="${escapeHTML(e.id)}">Delete entry</button>
    </div>
  `;
    $('detailDialog').showModal();
}

async function deleteEntry(id) {
    if (!confirm('Permanently delete this entry and its image?')) return;

    try {
        await saveData(entries.filter(e => e.id !== id));
        $('detailDialog').close();
        render();
        toast('Entry deleted.');
    } catch {
        toast('Could not delete entry.');
    }
}

$('closeForm').addEventListener('click', () => $('entryDialog').close());
$('cancelForm').addEventListener('click', () => $('entryDialog').close());
$('closeDetails').addEventListener('click', () => $('detailDialog').close());

document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;

    if (b.dataset.page) switchPage(b.dataset.page);
    if (b.hasAttribute('data-new')) openForm();
    if (b.dataset.detail) openDetail(b.dataset.detail);
    if (b.dataset.edit) {
        $('detailDialog').close();
        openForm(b.dataset.edit);
    }
    if (b.dataset.delete) deleteEntry(b.dataset.delete);
});

function weekBounds(value) {
    const date = new Date((value || localDate()) + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return null;

    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    const monday = localDate(date);
    date.setDate(date.getDate() + 6);
    return [monday, localDate(date)];
}

function weekEntries() {
    const bounds = weekBounds($('weekDate').value);
    return bounds
        ? sorted().filter(e => e.date >= bounds[0] && e.date <= bounds[1]).reverse()
        : [];
}

function renderReport() {
    const bounds = weekBounds($('weekDate').value);
    if (!bounds) return;

    $('weekRange').textContent =
        `${formatDate(bounds[0])} – ${formatDate(bounds[1])}`;

    const selected = weekEntries();
    $('reportPreview').innerHTML = selected.map(e => `
    <div class="report-preview-item">
      <strong>${formatDate(e.date)} · ${escapeHTML(e.task)}</strong>
      <span>${fmt(e.hours)} hours · ${escapeHTML(e.description)}</span>
      ${e.image ? `<br><img src="${e.image}" alt="Attached work image">` : ''}
    </div>
  `).join('') || '<div class="empty">No entries in this week yet.</div>';

    $('exportButton').disabled = !selected.length;
}

$('weekDate').addEventListener('change', renderReport);

// A .docx is a ZIP archive containing Word XML files.
const utf8 = s => new TextEncoder().encode(s);

function u16(n) {
    return [n & 255, (n >>> 8) & 255];
}

function u32(n) {
    return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) {
        n = (n & 1) ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    }
    return n >>> 0;
});

function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) {
        c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function zip(files) {
    const parts = [];
    const central = [];
    let offset = 0;

    for (const [path, data] of files) {
        const name = utf8(path);
        const bytes = typeof data === 'string' ? utf8(data) : data;
        const crc = crc32(bytes);

        const local = new Uint8Array([
            ...u32(0x04034b50),
            ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc),
            ...u32(bytes.length), ...u32(bytes.length),
            ...u16(name.length), ...u16(0),
            ...name
        ]);
        parts.push(local, bytes);

        central.push(new Uint8Array([
            ...u32(0x02014b50),
            ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(crc),
            ...u32(bytes.length), ...u32(bytes.length),
            ...u16(name.length),
            ...u16(0), ...u16(0), ...u16(0), ...u16(0),
            ...u32(0), ...u32(offset),
            ...name
        ]));

        offset += local.length + bytes.length;
    }

    const centralSize = central.reduce((n, p) => n + p.length, 0);
    const end = new Uint8Array([
        ...u32(0x06054b50),
        ...u16(0), ...u16(0),
        ...u16(files.length), ...u16(files.length),
        ...u32(centralSize), ...u32(offset), ...u16(0)
    ]);

    return new Blob([...parts, ...central, end], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
}

function paragraph(text, bold = false) {
    return `<w:p><w:r><w:rPr>${bold ? '<w:b/>' : ''}</w:rPr>` +
        `<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function imageRun(id, index) {
    return `<w:p><w:r><w:drawing>` +
        `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
        `<wp:extent cx="4572000" cy="3429000"/>` +
        `<wp:docPr id="${index}" name="Evidence ${index}"/>` +
        `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
        `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<pic:nvPicPr><pic:cNvPr id="${index}" name="Evidence ${index}.png"/>` +
        `<pic:cNvPicPr/></pic:nvPicPr>` +
        `<pic:blipFill><a:blip r:embed="${id}"/>` +
        `<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/>` +
        `<a:ext cx="4572000" cy="3429000"/></a:xfrm>` +
        `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
        `</pic:pic></a:graphicData></a:graphic>` +
        `</wp:inline></w:drawing></w:r></w:p>`;
}

function base64Bytes(url) {
    const raw = atob(url.split(',')[1]);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function createDocx(selected, bounds) {
    const files = [];
    const relations = [];
    const body = [];

    body.push(
        paragraph('WEEKLY OJT REPORT', true),
        paragraph(`Student: ${studentName || 'Student'}`),
        paragraph(`Week: ${formatDate(bounds[0])} – ${formatDate(bounds[1])}`),
        paragraph(`Total rendered hours: ${fmt(selected.reduce((s, e) => s + e.hours, 0))}`),
        paragraph(' ')
    );

    let i = 0;

    for (const e of selected) {
        body.push(
            paragraph(`Date: ${formatDate(e.date)}`, true),
            paragraph(`Task: ${e.task}`),
            paragraph(
                `Time: ${e.timeIn} – ${e.timeOut} | Break: ${e.breakMinutes} minutes | Rendered: ${fmt(e.hours)} hours`
            )
        );

        if (e.image) {
            i++;
            const id = `rId${i}`;
            const path = `media/evidence${i}.png`;

            files.push([`word/${path}`, base64Bytes(e.image)]);
            relations.push(
                `<Relationship Id="${id}" ` +
                `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ` +
                `Target="${path}"/>`
            );
            body.push(paragraph('Image:'), imageRun(id, i));
        } else {
            body.push(paragraph('Image: None'));
        }

        body.push(
            paragraph(`Description: ${e.description}`),
            paragraph(' ')
        );
    }

    const doc =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document ` +
        `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
        `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
        `<w:body>${body.join('')}` +
        `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
        `<w:pgMar w:top="1100" w:right="1100" w:bottom="1100" w:left="1100"/>` +
        `</w:sectPr></w:body></w:document>`;

    const types =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Default Extension="png" ContentType="image/png"/>` +
        `<Override PartName="/word/document.xml" ` +
        `ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`;

    files.unshift(
        ['[Content_Types].xml', types],
        ['_rels/.rels',
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `<Relationship Id="rId1" ` +
            `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ` +
            `Target="word/document.xml"/></Relationships>`],
        ['word/document.xml', doc],
        ['word/_rels/document.xml.rels',
            `<?xml version="1.0" encoding="UTF-8"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `${relations.join('')}</Relationships>`]
    );

    return zip(files);
}

$('exportButton').addEventListener('click', () => {
    const selected = weekEntries();
    const bounds = weekBounds($('weekDate').value);
    if (!selected.length || !bounds) return;

    try {
        const blob = createDocx(selected, bounds);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `OJT_Weekly_Report_${bounds[0]}.docx`;
        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 30000);
        toast('Word report downloaded.');
    } catch {
        toast('Could not create the Word report.');
    }
});

$('today').textContent = new Date().toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
});

initialize();