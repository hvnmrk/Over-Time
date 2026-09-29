'use strict';


/* =================================
   HELPERS
================================= */

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


/* pagination */

let entriesCurrentPage = 1;

let entriesPageSize = 10;


/* attendance currently in progress */

let activeAttendance = null;


/* =================================
   DATABASE
================================= */

function openDatabase() {

    if (!('indexedDB' in window)) {

        return Promise.reject(
            Error(
                'This browser does not support IndexedDB.'
            )
        );

    }


    if (!dbPromise) {

        dbPromise = new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(
                        DB_NAME,
                        1
                    );


                request.onupgradeneeded =
                    () => {

                        if (
                            !request.result
                                .objectStoreNames
                                .contains(
                                    STORE_NAME
                                )
                        ) {

                            request.result
                                .createObjectStore(
                                    STORE_NAME
                                );

                        }

                    };


                request.onsuccess =
                    () => resolve(
                        request.result
                    );


                request.onerror =
                    () => reject(
                        request.error
                    );

            }
        );

    }


    return dbPromise;
}



async function loadData() {

    const db =
        await openDatabase();


    return new Promise(
        (resolve, reject) => {

            const request =
                db
                    .transaction(
                        STORE_NAME,
                        'readonly'
                    )
                    .objectStore(
                        STORE_NAME
                    )
                    .get(
                        RECORD_KEY
                    );


            request.onsuccess =
                () => resolve(
                    request.result
                );


            request.onerror =
                () => reject(
                    request.error
                );

        }
    );
}



async function saveData(
    nextEntries = entries,
    nextGoal = goal,
    nextName = studentName,
    nextAttendance = activeAttendance
) {

    const db =
        await openDatabase();


    await new Promise(
        (resolve, reject) => {

            const transaction =
                db.transaction(
                    STORE_NAME,
                    'readwrite'
                );


            transaction
                .objectStore(
                    STORE_NAME
                )
                .put(
                    {
                        entries: nextEntries,

                        goal: nextGoal,

                        studentName:
                            nextName,

                        activeAttendance:
                            nextAttendance
                    },

                    RECORD_KEY
                );


            transaction.oncomplete =
                resolve;


            transaction.onerror =
                () => reject(
                    transaction.error
                );


            transaction.onabort =
                () => reject(
                    transaction.error
                );

        }
    );


    entries = nextEntries;

    goal = nextGoal;

    studentName = nextName;

    activeAttendance =
        nextAttendance;


    updateStudentInfo();
}


/* =================================
   BASIC UTILITIES
================================= */

function escapeHTML(value) {

    return String(
        value ?? ''
    ).replace(
        /[&<>"']/g,

        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]
    );

}



function xml(value) {

    return escapeHTML(
        value
    ).replace(
        /\r/g,
        ''
    );

}



function localDate(
    date = new Date()
) {

    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        )
    ].join(
        '-'
    );

}



function currentTime() {

    const now =
        new Date();


    return [
        String(
            now.getHours()
        ).padStart(
            2,
            '0'
        ),

        String(
            now.getMinutes()
        ).padStart(
            2,
            '0'
        )
    ].join(
        ':'
    );

}



function formatDate(dateValue) {

    if (!dateValue) {
        return '—';
    }


    return new Date(
        `${dateValue}T12:00:00`
    ).toLocaleDateString(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }
    );

}



function formatClockTime(
    time
) {

    if (!time) {
        return '—';
    }


    const [
        hour,
        minute
    ] =
        time
            .split(':')
            .map(Number);


    const date =
        new Date(
            2000,
            0,
            1,
            hour,
            minute
        );


    return date
        .toLocaleTimeString(
            'en-PH',
            {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }
        );

}



function fmt(number) {

    return Number(
        Number(
            number
        ).toFixed(
            2
        )
    ).toString();

}



function toast(message) {

    $('toast').textContent =
        message;


    $('toast')
        .classList
        .add(
            'show'
        );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                $('toast')
                    .classList
                    .remove(
                        'show'
                    );

            },

            3000
        );

}


/* =================================
   USER INFO
================================= */

function updateStudentInfo() {

    const name =
        studentName ||
        'Student';


    $('profileName')
        .textContent =
        name;


    $('overviewName')
        .textContent =
        name.split(
            ' '
        )[0];


    $('profileAvatar')
        .textContent =
        studentName
            ? studentName
                .split(/\s+/)
                .filter(Boolean)
                .map(
                    value =>
                        value[0]
                )
                .slice(
                    0,
                    2
                )
                .join('')
                .toUpperCase()

            : 'S';


    $('studentName').value =
        studentName;


    $('hoursGoal').value =
        goal;

}


/* =================================
   INITIALIZE
================================= */

async function initialize() {

    try {

        const stored =
            await loadData();


        entries =
            Array.isArray(
                stored?.entries
            )
                ? stored.entries
                : [];


        goal =
            Number(
                stored?.goal
            ) > 0
                ? Number(
                    stored.goal
                )
                : 468;


        studentName =
            typeof stored?.studentName
                === 'string'
                ? stored.studentName
                : '';


        activeAttendance =
            stored?.activeAttendance &&
                typeof stored.activeAttendance
                === 'object'

                ? stored.activeAttendance

                : null;


        updateStudentInfo();


        $('weekDate').value =
            localDate();


        updateTodayDisplay();

        render();

    } catch (error) {

        console.error(
            error
        );


        toast(
            'Could not open local data.'
        );

    }

}



function updateTodayDisplay() {

    const now =
        new Date();


    $('today').textContent =
        now.toLocaleDateString(
            'en-PH',
            {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }
        );


    $('attendanceDate')
        .textContent =
        now.toLocaleDateString(
            'en-PH',
            {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }
        );

}


/* =================================
   NAVIGATION
================================= */

function closeMenu() {

    $('sidebar')
        .classList
        .remove(
            'open'
        );


    $('backdrop').hidden =
        true;

}



$('menuButton')
    .addEventListener(
        'click',

        () => {

            const open =
                $('sidebar')
                    .classList
                    .toggle(
                        'open'
                    );


            $('backdrop').hidden =
                !open;

        }
    );


$('backdrop')
    .addEventListener(
        'click',
        closeMenu
    );



function switchPage(page) {

    const validPages = [
        'overview',
        'entries',
        'reports',
        'settings'
    ];


    if (
        !validPages.includes(
            page
        )
    ) {
        return;
    }


    document
        .querySelectorAll(
            '.page'
        )
        .forEach(
            element => {

                element
                    .classList
                    .toggle(
                        'active',

                        element.id
                        === page
                    );

            }
        );


    document
        .querySelectorAll(
            '.nav-link'
        )
        .forEach(
            element => {

                element
                    .classList
                    .toggle(
                        'active',

                        element.dataset.page
                        === page
                    );

            }
        );


    const names = {
        overview:
            'Dashboard',

        entries:
            'Daily Logs',

        reports:
            'Weekly Report',

        settings:
            'Settings'
    };


    $('pageTitle').textContent =
        names[page];


    closeMenu();


    window.scrollTo(
        {
            top: 0,
            behavior: 'smooth'
        }
    );

}


/* =================================
   SETTINGS
================================= */

$('settingsForm')
    .addEventListener(
        'submit',

        async event => {

            event.preventDefault();


            const name =
                $('studentName')
                    .value
                    .trim();


            const newGoal =
                Number(
                    $('hoursGoal')
                        .value
                );


            if (!name) {

                toast(
                    'Enter your name.'
                );

                return;

            }


            if (
                !Number.isFinite(
                    newGoal
                ) ||
                newGoal < 1 ||
                newGoal > 10000
            ) {

                toast(
                    'Enter a valid required-hours value.'
                );

                return;

            }


            try {

                await saveData(
                    entries,
                    newGoal,
                    name,
                    activeAttendance
                );


                render();


                toast(
                    'Settings saved.'
                );

            } catch {

                toast(
                    'Could not save settings.'
                );

            }

        }
    );


/* =================================
   BACKUP
================================= */

$('backupButton')
    .addEventListener(
        'click',

        () => {

            const backup =
                JSON.stringify(
                    {
                        format:
                            'overtime-backup-v2',

                        savedAt:
                            new Date()
                                .toISOString(),

                        studentName,

                        goal,

                        entries,

                        activeAttendance
                    },

                    null,
                    2
                );


            const blob =
                new Blob(
                    [backup],
                    {
                        type:
                            'application/json'
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document
                    .createElement(
                        'a'
                    );


            link.href =
                url;


            link.download =
                `OverTime_Backup_${localDate()}.json`;


            document.body
                .append(
                    link
                );


            link.click();

            link.remove();


            setTimeout(
                () =>
                    URL.revokeObjectURL(
                        url
                    ),

                30000
            );


            toast(
                'Backup downloaded.'
            );

        }
    );



$('importBackup')
    .addEventListener(
        'change',

        async event => {

            const file =
                event.target
                    .files?.[0];


            event.target.value =
                '';


            if (!file) {
                return;
            }


            try {

                const backup =
                    JSON.parse(
                        await file.text()
                    );


                if (
                    !Array.isArray(
                        backup.entries
                    ) ||
                    !Number.isFinite(
                        Number(
                            backup.goal
                        )
                    )
                ) {

                    throw Error(
                        'Invalid backup.'
                    );

                }


                if (
                    !confirm(
                        `Replace your current data with ${backup.entries.length} imported entries?`
                    )
                ) {
                    return;
                }


                await saveData(
                    backup.entries,

                    Number(
                        backup.goal
                    ),

                    String(
                        backup.studentName ||
                        ''
                    ),

                    backup.activeAttendance ||
                    null
                );


                entriesCurrentPage =
                    1;


                render();


                toast(
                    'Backup imported.'
                );

            } catch {

                toast(
                    'Could not import this backup.'
                );

            }

        }
    );


/* =================================
   HOURS
================================= */

function calculateHours(
    start,
    end,
    breakValue
) {

    if (
        !start ||
        !end ||
        breakValue === ''
    ) {

        return null;

    }


    const [
        startHour,
        startMinute
    ] =
        start
            .split(':')
            .map(Number);


    const [
        endHour,
        endMinute
    ] =
        end
            .split(':')
            .map(Number);


    const startMinutes =
        startHour * 60 +
        startMinute;


    const endMinutes =
        endHour * 60 +
        endMinute;


    const duration =
        endMinutes -
        startMinutes;


    const breakMinutes =
        Number(
            breakValue
        );


    if (
        duration <= 0 ||
        !Number.isFinite(
            breakMinutes
        ) ||
        breakMinutes < 0 ||
        breakMinutes >= duration
    ) {

        return null;

    }


    return Math.round(
        (
            (
                duration -
                breakMinutes
            ) / 60
        ) * 100
    ) / 100;

}



function updatePreview() {

    const hours =
        calculateHours(
            $('timeIn').value,
            $('timeOut').value,
            $('breakMinutes').value
        );


    $('hoursPreview')
        .textContent =
        hours === null
            ? 'Rendered hours: —'
            : `Rendered hours: ${fmt(hours)} hrs`;

}



[
    'timeIn',
    'timeOut',
    'breakMinutes'
]
    .forEach(
        id => {

            $(id)
                .addEventListener(
                    'input',
                    updatePreview
                );

        }
    );


/* =================================
   CURRENT TIME BUTTONS
================================= */

$('timeInNow')
    .addEventListener(
        'click',

        () => {

            $('timeIn').value =
                currentTime();


            $('entryDate').value =
                localDate();


            updatePreview();


            toast(
                `Time in set to ${formatClockTime(
                    $('timeIn').value
                )}.`
            );

        }
    );


$('timeOutNow')
    .addEventListener(
        'click',

        () => {

            $('timeOut').value =
                currentTime();


            updatePreview();


            toast(
                `Time out set to ${formatClockTime(
                    $('timeOut').value
                )}.`
            );

        }
    );


/* =================================
   QUICK ATTENDANCE
================================= */

$('quickTimeIn')
    .addEventListener(
        'click',

        async () => {

            if (
                activeAttendance &&
                activeAttendance.date
                === localDate()
            ) {

                toast(
                    'You already timed in today.'
                );

                return;

            }


            const attendance = {
                date:
                    localDate(),

                timeIn:
                    currentTime(),

                timeOut:
                    null
            };


            try {

                await saveData(
                    entries,
                    goal,
                    studentName,
                    attendance
                );


                renderAttendance();


                toast(
                    `Timed in at ${formatClockTime(
                        attendance.timeIn
                    )}.`
                );

            } catch {

                toast(
                    'Could not save time in.'
                );

            }

        }
    );



$('quickTimeOut')
    .addEventListener(
        'click',

        async () => {

            if (
                !activeAttendance ||
                activeAttendance.date
                !== localDate()
            ) {

                toast(
                    'Time in first.'
                );

                return;

            }


            if (
                activeAttendance.timeOut
            ) {

                toast(
                    'You already timed out.'
                );

                return;

            }


            const completed = {
                ...activeAttendance,

                timeOut:
                    currentTime()
            };


            try {

                await saveData(
                    entries,
                    goal,
                    studentName,
                    completed
                );


                renderAttendance();


                /*
                    Open the entry form and copy today's
                    attendance into Time In and Time Out.
                */

                openForm();


                $('entryDate').value =
                    completed.date;


                $('timeIn').value =
                    completed.timeIn;


                $('timeOut').value =
                    completed.timeOut;


                updatePreview();


                toast(
                    'Time out recorded. Complete your daily log.'
                );

            } catch {

                toast(
                    'Could not save time out.'
                );

            }

        }
    );



function renderAttendance() {

    const today =
        localDate();


    const attendance =
        activeAttendance?.date
            === today
            ? activeAttendance
            : null;


    const timeInButton =
        $('quickTimeIn');


    const timeOutButton =
        $('quickTimeOut');


    if (!attendance) {

        $('attendanceStatus')
            .textContent =
            'You haven\'t timed in yet.';


        $('attendanceTimes')
            .innerHTML =
            '';


        timeInButton.disabled =
            false;


        timeOutButton.disabled =
            true;


        return;

    }


    if (
        attendance.timeIn &&
        !attendance.timeOut
    ) {

        $('attendanceStatus')
            .textContent =
            'Currently timed in.';


        $('attendanceTimes')
            .innerHTML = `
                <span>
                    Time In:
                    <strong>
                        ${formatClockTime(
                attendance.timeIn
            )}
                    </strong>
                </span>
            `;


        timeInButton.disabled =
            true;


        timeOutButton.disabled =
            false;


        return;

    }


    $('attendanceStatus')
        .textContent =
        'Attendance recorded for today.';


    $('attendanceTimes')
        .innerHTML = `
            <span>
                Time In:
                <strong>
                    ${formatClockTime(
            attendance.timeIn
        )}
                </strong>
            </span>

            <span>
                Time Out:
                <strong>
                    ${formatClockTime(
            attendance.timeOut
        )}
                </strong>
            </span>
        `;


    timeInButton.disabled =
        true;


    timeOutButton.disabled =
        true;

}


/* =================================
   ENTRY SORTING
================================= */

function sorted() {

    return [...entries]
        .sort(
            (a, b) => {

                return (
                    b.date.localeCompare(
                        a.date
                    ) ||

                    Number(
                        b.createdAt || 0
                    ) -

                    Number(
                        a.createdAt || 0
                    )
                );

            }
        );

}


/* =================================
   MAIN RENDER
================================= */

function render() {

    const total =
        entries.reduce(
            (
                sum,
                entry
            ) => {

                return (
                    sum +
                    Number(
                        entry.hours || 0
                    )
                );

            },

            0
        );


    const remaining =
        Math.max(
            0,
            goal - total
        );


    const percent =
        goal > 0
            ? Math.min(
                100,

                Math.round(
                    total /
                    goal *
                    100
                )
            )

            : 0;


    $('renderedHours')
        .textContent =
        fmt(
            total
        );


    $('requiredHours')
        .textContent =
        fmt(
            goal
        );


    $('entryCount')
        .textContent =
        entries.length;


    $('remainingHours')
        .textContent =
        `${fmt(remaining)} hours remaining`;


    $('percentage')
        .textContent =
        `${percent}%`;


    $('goalProgress').value =
        percent;


    $('progressRendered')
        .textContent =
        `${fmt(total)} rendered`;


    $('progressRemaining')
        .textContent =
        `${fmt(remaining)} remaining`;


    renderRecentEntries();

    renderEntries();

    renderReport();

    renderAttendance();

}



function renderRecentEntries() {

    const recent =
        sorted()
            .slice(
                0,
                3
            );


    if (!recent.length) {

        $('recentEntries')
            .innerHTML = `
                <div class="empty">
                    No daily logs yet.
                </div>
            `;

        return;

    }


    $('recentEntries')
        .innerHTML =
        recent
            .map(
                entry => `

                    <button
                        class="recent-item"
                        data-detail="${escapeHTML(
                    entry.id
                )}"
                        type="button"
                    >

                        <span>

                            <strong>
                                ${escapeHTML(
                    entry.task
                )}
                            </strong>

                            <small>
                                ${formatDate(
                    entry.date
                )}
                            </small>

                        </span>

                        <b>
                            ${fmt(
                    entry.hours
                )}h
                        </b>

                    </button>

                `
            )
            .join('');

}


/* =================================
   ENTRY FILTERS + PAGINATION
================================= */

function getFilteredEntries() {

    const query =
        $('search')
            .value
            .trim()
            .toLowerCase();


    const dateFrom =
        $('filterDateFrom')
            .value;


    const dateTo =
        $('filterDateTo')
            .value;


    const sortType =
        $('entrySort')
            .value;


    let filtered =
        entries.filter(
            entry => {

                const searchable =
                    [
                        entry.date,

                        entry.task,

                        entry.description,

                        entry.timeIn,

                        entry.timeOut
                    ]
                        .join(' ')
                        .toLowerCase();


                const matchesSearch =
                    !query ||
                    searchable.includes(
                        query
                    );


                const matchesFrom =
                    !dateFrom ||
                    entry.date >=
                    dateFrom;


                const matchesTo =
                    !dateTo ||
                    entry.date <=
                    dateTo;


                return (
                    matchesSearch &&
                    matchesFrom &&
                    matchesTo
                );

            }
        );


    filtered.sort(
        (a, b) => {

            switch (
            sortType
            ) {

                case 'oldest':

                    return (
                        a.date.localeCompare(
                            b.date
                        ) ||

                        Number(
                            a.createdAt || 0
                        ) -

                        Number(
                            b.createdAt || 0
                        )
                    );


                case 'hours-high':

                    return (
                        Number(
                            b.hours || 0
                        ) -

                        Number(
                            a.hours || 0
                        )
                    );


                case 'hours-low':

                    return (
                        Number(
                            a.hours || 0
                        ) -

                        Number(
                            b.hours || 0
                        )
                    );


                case 'task-az':

                    return (
                        String(
                            a.task
                        ).localeCompare(
                            String(
                                b.task
                            ),

                            undefined,

                            {
                                sensitivity:
                                    'base'
                            }
                        )
                    );


                case 'newest':
                default:

                    return (
                        b.date.localeCompare(
                            a.date
                        ) ||

                        Number(
                            b.createdAt || 0
                        ) -

                        Number(
                            a.createdAt || 0
                        )
                    );

            }

        }
    );


    return filtered;

}



function renderEntries() {

    entriesPageSize =
        Number(
            $('entriesPerPage')
                .value
        ) || 10;


    const filtered =
        getFilteredEntries();


    $('entriesResultCount')
        .textContent =
        `${filtered.length} ${filtered.length === 1
            ? 'entry'
            : 'entries'
        }`;


    const totalPages =
        Math.max(
            1,

            Math.ceil(
                filtered.length /
                entriesPageSize
            )
        );


    if (
        entriesCurrentPage >
        totalPages
    ) {

        entriesCurrentPage =
            totalPages;

    }


    if (
        entriesCurrentPage <
        1
    ) {

        entriesCurrentPage =
            1;

    }


    const start =
        (
            entriesCurrentPage -
            1
        ) *
        entriesPageSize;


    const paginated =
        filtered.slice(
            start,

            start +
            entriesPageSize
        );


    if (!paginated.length) {

        $('entriesList')
            .innerHTML = `
                <div class="empty">

                    <strong>
                        ${entries.length
                ? 'No matching entries'
                : 'No daily logs yet'
            }
                    </strong>

                    <p>
                        ${entries.length
                ? 'Try changing your search or filters.'
                : 'Add your first OJT entry to get started.'
            }
                    </p>

                </div>
            `;


        renderEntryPagination(
            filtered.length,
            totalPages
        );


        return;

    }


    $('entriesList')
        .innerHTML =
        paginated
            .map(
                entry => `

                    <article class="entry-card">

                        <div class="entry-top">

                            <div>

                                <h3>
                                    ${escapeHTML(
                    entry.task
                )}
                                </h3>

                                <span class="entry-meta">

                                    ${formatDate(
                    entry.date
                )}

                                    ·

                                    ${formatClockTime(
                    entry.timeIn
                )}

                                    –

                                    ${formatClockTime(
                    entry.timeOut
                )}

                                    ·

                                    ${fmt(
                    entry.hours
                )} hours

                                </span>

                            </div>

                            ${entry.image
                        ? '<span title="Photo attached">📷</span>'
                        : ''
                    }

                        </div>


                        <p class="entry-description">
                            ${escapeHTML(
                        entry.description
                    )}
                        </p>


                        <div class="entry-actions">

                            <button
                                data-detail="${escapeHTML(
                        entry.id
                    )}"
                                type="button"
                            >
                                View Details
                            </button>

                            <button
                                data-edit="${escapeHTML(
                        entry.id
                    )}"
                                type="button"
                            >
                                Edit
                            </button>

                        </div>

                    </article>

                `
            )
            .join('');


    renderEntryPagination(
        filtered.length,
        totalPages
    );

}



function renderEntryPagination(
    totalEntries,
    totalPages
) {

    const container =
        $('entryPagination');


    if (
        totalEntries === 0 ||
        totalPages <= 1
    ) {

        container.innerHTML =
            '';

        return;

    }


    let html =
        '';


    html += `
        <button
            type="button"
            data-page-number="${entriesCurrentPage -
        1
        }"
            ${entriesCurrentPage ===
            1
            ? 'disabled'
            : ''
        }
        >
            Previous
        </button>
    `;


    const visiblePages =
        [];


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const isEdge =
            page === 1 ||
            page === totalPages;


        const nearCurrent =
            Math.abs(
                page -
                entriesCurrentPage
            ) <= 1;


        if (
            isEdge ||
            nearCurrent
        ) {

            visiblePages.push(
                page
            );

        }

    }


    let previous =
        0;


    for (
        const page
        of visiblePages
    ) {

        if (
            previous &&
            page -
            previous >
            1
        ) {

            html += `
                <span class="pagination-info">
                    …
                </span>
            `;

        }


        html += `
            <button
                type="button"
                data-page-number="${page}"
                class="${page ===
                entriesCurrentPage
                ? 'active'
                : ''
            }"
            >
                ${page}
            </button>
        `;


        previous =
            page;

    }


    html += `
        <button
            type="button"
            data-page-number="${entriesCurrentPage +
        1
        }"
            ${entriesCurrentPage ===
            totalPages
            ? 'disabled'
            : ''
        }
        >
            Next
        </button>
    `;


    container.innerHTML =
        html;

}


/* =================================
   FILTER EVENTS
================================= */

function resetEntryPage() {

    entriesCurrentPage =
        1;


    renderEntries();

}



$('search')
    .addEventListener(
        'input',
        resetEntryPage
    );


$('filterDateFrom')
    .addEventListener(
        'change',
        resetEntryPage
    );


$('filterDateTo')
    .addEventListener(
        'change',
        resetEntryPage
    );


$('entrySort')
    .addEventListener(
        'change',
        resetEntryPage
    );


$('entriesPerPage')
    .addEventListener(
        'change',
        resetEntryPage
    );



$('clearEntryFilters')
    .addEventListener(
        'click',

        () => {

            $('search').value =
                '';


            $('filterDateFrom').value =
                '';


            $('filterDateTo').value =
                '';


            $('entrySort').value =
                'newest';


            $('entriesPerPage').value =
                '10';


            entriesCurrentPage =
                1;


            renderEntries();

        }
    );


/* =================================
   ENTRY FORM
================================= */

function openForm(
    id = null
) {

    const entry =
        entries.find(
            item =>
                item.id ===
                id
        );


    editingId =
        entry?.id ??
        null;


    $('entryForm').reset();


    $('formError').textContent =
        '';


    $('attachmentNote')
        .textContent =
        entry?.image
            ? 'Existing photo will remain unless you select another.'
            : '';


    $('formTitle').textContent =
        entry
            ? 'Edit Entry'
            : 'New Entry';


    $('entryDate').value =
        entry?.date ||
        localDate();


    $('task').value =
        entry?.task ||
        '';


    $('timeIn').value =
        entry?.timeIn ||
        '';


    $('timeOut').value =
        entry?.timeOut ||
        '';


    $('breakMinutes').value =
        entry?.breakMinutes ??
        60;


    $('description').value =
        entry?.description ||
        '';


    updatePreview();


    $('entryDialog')
        .showModal();

}



function fileData(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();


            reader.onload =
                () => resolve(
                    reader.result
                );


            reader.onerror =
                () => reject(
                    Error(
                        'Could not read image.'
                    )
                );


            reader
                .readAsDataURL(
                    file
                );

        }
    );

}



function normalizeImage(
    source
) {

    return new Promise(
        (resolve, reject) => {

            const image =
                new Image();


            image.onload =
                () => {

                    const scale =
                        Math.min(
                            1,

                            1000 /
                            Math.max(
                                image.width,
                                image.height
                            )
                        );


                    const canvas =
                        document
                            .createElement(
                                'canvas'
                            );


                    canvas.width =
                        Math.max(
                            1,

                            Math.round(
                                image.width *
                                scale
                            )
                        );


                    canvas.height =
                        Math.max(
                            1,

                            Math.round(
                                image.height *
                                scale
                            )
                        );


                    const context =
                        canvas.getContext(
                            '2d'
                        );


                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                    resolve(
                        canvas.toDataURL(
                            'image/png'
                        )
                    );

                };


            image.onerror =
                () => reject(
                    Error(
                        'Could not process image.'
                    )
                );


            image.src =
                source;

        }
    );

}


/* =================================
   SAVE ENTRY
================================= */

$('entryForm')
    .addEventListener(
        'submit',

        async event => {

            event.preventDefault();


            $('formError')
                .textContent =
                '';


            const hours =
                calculateHours(
                    $('timeIn').value,

                    $('timeOut').value,

                    $('breakMinutes').value
                );


            if (
                hours === null
            ) {

                $('formError')
                    .textContent =
                    'Check your time in, time out, and break duration.';

                return;

            }


            const task =
                $('task')
                    .value
                    .trim();


            const description =
                $('description')
                    .value
                    .trim();


            if (
                !task ||
                !description
            ) {

                $('formError')
                    .textContent =
                    'Enter a task and description.';

                return;

            }


            const file =
                $('evidence')
                    .files[0];


            if (
                file &&
                (
                    ![
                        'image/png',
                        'image/jpeg',
                        'image/webp'
                    ].includes(
                        file.type
                    ) ||

                    file.size >
                    2 * 1024 * 1024
                )
            ) {

                $('formError')
                    .textContent =
                    'Choose a PNG, JPG, or WebP image up to 2 MB.';

                return;

            }


            $('saveButton')
                .disabled =
                true;


            try {

                const oldEntry =
                    entries.find(
                        entry =>
                            entry.id ===
                            editingId
                    );


                const image =
                    file
                        ? await normalizeImage(
                            await fileData(
                                file
                            )
                        )

                        : oldEntry?.image ||
                        null;


                const record = {

                    id:
                        oldEntry?.id ||
                        crypto.randomUUID(),

                    createdAt:
                        oldEntry?.createdAt ||
                        Date.now(),

                    date:
                        $('entryDate').value,

                    task,

                    description,

                    timeIn:
                        $('timeIn').value,

                    timeOut:
                        $('timeOut').value,

                    breakMinutes:
                        Number(
                            $('breakMinutes')
                                .value
                        ),

                    hours,

                    image

                };


                const nextEntries =
                    oldEntry

                        ? entries.map(
                            entry =>
                                entry.id ===
                                    oldEntry.id
                                    ? record
                                    : entry
                        )

                        : [
                            record,
                            ...entries
                        ];


                /*
                    If this entry uses the finished
                    attendance record for today,
                    clear activeAttendance afterward.
                */

                let nextAttendance =
                    activeAttendance;


                if (
                    activeAttendance &&
                    activeAttendance.date ===
                    record.date &&
                    activeAttendance.timeIn ===
                    record.timeIn &&
                    activeAttendance.timeOut ===
                    record.timeOut
                ) {

                    nextAttendance =
                        null;

                }


                await saveData(
                    nextEntries,
                    goal,
                    studentName,
                    nextAttendance
                );


                entriesCurrentPage =
                    1;


                $('entryDialog')
                    .close();


                render();


                toast(
                    oldEntry
                        ? 'Entry updated.'
                        : 'Entry saved.'
                );

            } catch (
            error
            ) {

                console.error(
                    error
                );


                $('formError')
                    .textContent =
                    'Could not save this entry.';

            } finally {

                $('saveButton')
                    .disabled =
                    false;

            }

        }
    );


/* =================================
   ENTRY DETAILS
================================= */

function openDetail(id) {

    const entry =
        entries.find(
            item =>
                item.id ===
                id
        );


    if (!entry) {
        return;
    }


    $('detailTitle')
        .textContent =
        entry.task;


    $('detailContent')
        .innerHTML = `

            <p class="entry-meta">

                ${formatDate(
            entry.date
        )}

                ·

                ${formatClockTime(
            entry.timeIn
        )}

                –

                ${formatClockTime(
            entry.timeOut
        )}

                ·

                ${fmt(
            entry.hours
        )} hours

                ·

                ${Number(
            entry.breakMinutes
        )} minute break

            </p>


            <h3>
                Tasks Accomplished
            </h3>

            <p class="detail-copy">
                ${escapeHTML(
            entry.description
        )}
            </p>


            <h3>
                Photo Evidence
            </h3>

            ${entry.image

            ? `
                        <img
                            class="detail-photo"
                            src="${entry.image}"
                            alt="Photo evidence"
                        >
                    `

            : `
                        <p class="muted">
                            No photo attached.
                        </p>
                    `
        }


            <div class="entry-actions">

                <button
                    data-edit="${escapeHTML(
            entry.id
        )}"
                    type="button"
                >
                    Edit Entry
                </button>

                <button
                    class="danger"
                    data-delete="${escapeHTML(
            entry.id
        )}"
                    type="button"
                >
                    Delete Entry
                </button>

            </div>
        `;


    $('detailDialog')
        .showModal();

}



async function deleteEntry(
    id
) {

    if (
        !confirm(
            'Delete this entry permanently?'
        )
    ) {

        return;

    }


    try {

        await saveData(
            entries.filter(
                entry =>
                    entry.id !==
                    id
            ),
            goal,
            studentName,
            activeAttendance
        );


        $('detailDialog')
            .close();


        render();


        toast(
            'Entry deleted.'
        );

    } catch {

        toast(
            'Could not delete entry.'
        );

    }

}


/* =================================
   DIALOG BUTTONS
================================= */

$('closeForm')
    .addEventListener(
        'click',
        () =>
            $('entryDialog')
                .close()
    );


$('cancelForm')
    .addEventListener(
        'click',
        () =>
            $('entryDialog')
                .close()
    );


$('closeDetails')
    .addEventListener(
        'click',
        () =>
            $('detailDialog')
                .close()
    );


/* =================================
   GLOBAL CLICK HANDLER
================================= */

document
    .addEventListener(
        'click',

        event => {

            const button =
                event.target
                    .closest(
                        'button'
                    );


            if (!button) {
                return;
            }


            if (
                button.dataset.page
            ) {

                switchPage(
                    button.dataset.page
                );

            }


            if (
                button.hasAttribute(
                    'data-new'
                )
            ) {

                openForm();

            }


            if (
                button.dataset.detail
            ) {

                openDetail(
                    button.dataset.detail
                );

            }


            if (
                button.dataset.edit
            ) {

                $('detailDialog')
                    .close();


                openForm(
                    button.dataset.edit
                );

            }


            if (
                button.dataset.delete
            ) {

                deleteEntry(
                    button.dataset.delete
                );

            }


            if (
                button.dataset.pageNumber
            ) {

                const page =
                    Number(
                        button.dataset
                            .pageNumber
                    );


                if (
                    Number.isInteger(
                        page
                    ) &&
                    page >= 1
                ) {

                    entriesCurrentPage =
                        page;


                    renderEntries();


                    document
                        .getElementById(
                            'entries'
                        )
                        .scrollIntoView(
                            {
                                behavior:
                                    'smooth',

                                block:
                                    'start'
                            }
                        );

                }

            }

        }
    );


/* =================================
   WEEKLY REPORT
================================= */

function weekBounds(
    value
) {

    const date =
        new Date(
            `${value ||
            localDate()
            }T12:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    const currentDay =
        date.getDay();


    const difference =
        (
            currentDay +
            6
        ) % 7;


    date.setDate(
        date.getDate() -
        difference
    );


    const monday =
        localDate(
            date
        );


    date.setDate(
        date.getDate() +
        6
    );


    const sunday =
        localDate(
            date
        );


    return [
        monday,
        sunday
    ];

}



function weekEntries() {

    const bounds =
        weekBounds(
            $('weekDate').value
        );


    if (!bounds) {
        return [];
    }


    return sorted()
        .filter(
            entry =>
                entry.date >=
                bounds[0] &&

                entry.date <=
                bounds[1]
        )
        .reverse();

}



function renderReport() {

    const bounds =
        weekBounds(
            $('weekDate').value
        );


    if (!bounds) {
        return;
    }


    $('weekRange')
        .textContent =
        `${formatDate(
            bounds[0]
        )} – ${formatDate(
            bounds[1]
        )}`;


    const selected =
        weekEntries();


    if (
        !selected.length
    ) {

        $('reportPreview')
            .innerHTML = `

                <div class="empty">

                    <strong>
                        No entries for this week
                    </strong>

                    <p>
                        Daily logs recorded during
                        this week will appear here.
                    </p>

                </div>
            `;


        $('exportButton')
            .disabled =
            true;


        return;

    }


    $('reportPreview')
        .innerHTML =
        selected
            .map(
                entry => `

                    <article class="report-preview-item">

                        <strong>
                            ${formatDate(
                    entry.date
                )}
                            ·
                            ${escapeHTML(
                    entry.task
                )}
                        </strong>

                        <span>

                            ${formatClockTime(
                    entry.timeIn
                )}

                            –

                            ${formatClockTime(
                    entry.timeOut
                )}

                            ·

                            ${fmt(
                    entry.hours
                )} hours

                        </span>

                        <span>
                            ${escapeHTML(
                    entry.description
                )}
                        </span>

                        ${entry.image

                        ? `
                                    <img
                                        src="${entry.image}"
                                        alt="Photo evidence"
                                    >
                                `

                        : ''
                    }

                    </article>

                `
            )
            .join('');


    $('exportButton')
        .disabled =
        false;

}



$('weekDate')
    .addEventListener(
        'change',
        renderReport
    );


/* =================================
   DOCX UTILITIES
================================= */

const utf8 =
    value =>
        new TextEncoder()
            .encode(
                value
            );



function u16(number) {

    return [
        number & 255,

        (
            number >>>
            8
        ) & 255
    ];

}



function u32(number) {

    return [
        number & 255,

        (
            number >>>
            8
        ) & 255,

        (
            number >>>
            16
        ) & 255,

        (
            number >>>
            24
        ) & 255
    ];

}



const crcTable =
    Array.from(
        {
            length:
                256
        },

        (_, start) => {

            let number =
                start;


            for (
                let index = 0;
                index < 8;
                index++
            ) {

                number =
                    (
                        number &
                        1
                    )

                        ? (
                            0xedb88320 ^
                            (
                                number >>>
                                1
                            )
                        )

                        : (
                            number >>>
                            1
                        );

            }


            return (
                number >>>
                0
            );

        }
    );



function crc32(bytes) {

    let crc =
        0xffffffff;


    for (
        const byte
        of bytes
    ) {

        crc =
            crcTable[
            (
                crc ^
                byte
            ) &
            255
            ] ^
            (
                crc >>>
                8
            );

    }


    return (
        crc ^
        0xffffffff
    ) >>> 0;

}



function zip(files) {

    const parts =
        [];


    const central =
        [];


    let offset =
        0;


    for (
        const [
            path,
            data
        ]
        of files
    ) {

        const name =
            utf8(
                path
            );


        const bytes =
            typeof data ===
                'string'

                ? utf8(
                    data
                )

                : data;


        const crc =
            crc32(
                bytes
            );


        const local =
            new Uint8Array(
                [
                    ...u32(
                        0x04034b50
                    ),

                    ...u16(20),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u32(crc),

                    ...u32(
                        bytes.length
                    ),

                    ...u32(
                        bytes.length
                    ),

                    ...u16(
                        name.length
                    ),

                    ...u16(0),

                    ...name
                ]
            );


        parts.push(
            local,
            bytes
        );


        central.push(
            new Uint8Array(
                [
                    ...u32(
                        0x02014b50
                    ),

                    ...u16(20),

                    ...u16(20),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u32(crc),

                    ...u32(
                        bytes.length
                    ),

                    ...u32(
                        bytes.length
                    ),

                    ...u16(
                        name.length
                    ),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u16(0),

                    ...u32(0),

                    ...u32(
                        offset
                    ),

                    ...name
                ]
            )
        );


        offset +=
            local.length +
            bytes.length;

    }


    const centralSize =
        central.reduce(
            (
                total,
                part
            ) =>
                total +
                part.length,

            0
        );


    const end =
        new Uint8Array(
            [
                ...u32(
                    0x06054b50
                ),

                ...u16(0),

                ...u16(0),

                ...u16(
                    files.length
                ),

                ...u16(
                    files.length
                ),

                ...u32(
                    centralSize
                ),

                ...u32(
                    offset
                ),

                ...u16(0)
            ]
        );


    return new Blob(
        [
            ...parts,
            ...central,
            end
        ],

        {
            type:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
    );

}



function paragraph(
    text,
    bold = false
) {

    return `
        <w:p>
            <w:r>
                <w:rPr>
                    ${bold
            ? '<w:b/>'
            : ''
        }
                </w:rPr>

                <w:t xml:space="preserve">
                    ${xml(text)}
                </w:t>
            </w:r>
        </w:p>
    `;

}



function imageRun(
    relationId,
    index
) {

    return `
        <w:p>
            <w:r>
                <w:drawing>

                    <wp:inline
                        distT="0"
                        distB="0"
                        distL="0"
                        distR="0"
                    >

                        <wp:extent
                            cx="4572000"
                            cy="3429000"
                        />

                        <wp:docPr
                            id="${index}"
                            name="Evidence ${index}"
                        />

                        <a:graphic
                            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                        >

                            <a:graphicData
                                uri="http://schemas.openxmlformats.org/drawingml/2006/picture"
                            >

                                <pic:pic
                                    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
                                >

                                    <pic:nvPicPr>

                                        <pic:cNvPr
                                            id="${index}"
                                            name="Evidence ${index}.png"
                                        />

                                        <pic:cNvPicPr/>

                                    </pic:nvPicPr>


                                    <pic:blipFill>

                                        <a:blip
                                            r:embed="${relationId}"
                                        />

                                        <a:stretch>
                                            <a:fillRect/>
                                        </a:stretch>

                                    </pic:blipFill>


                                    <pic:spPr>

                                        <a:xfrm>

                                            <a:off
                                                x="0"
                                                y="0"
                                            />

                                            <a:ext
                                                cx="4572000"
                                                cy="3429000"
                                            />

                                        </a:xfrm>

                                        <a:prstGeom
                                            prst="rect"
                                        >
                                            <a:avLst/>
                                        </a:prstGeom>

                                    </pic:spPr>

                                </pic:pic>

                            </a:graphicData>

                        </a:graphic>

                    </wp:inline>

                </w:drawing>
            </w:r>
        </w:p>
    `;

}



function base64Bytes(url) {

    const raw =
        atob(
            url.split(
                ','
            )[1]
        );


    return Uint8Array.from(
        raw,

        character =>
            character.charCodeAt(
                0
            )
    );

}


/* =================================
   CREATE WORD REPORT
================================= */

function createDocx(
    selected,
    bounds
) {

    const files =
        [];


    const relations =
        [];


    const body =
        [];


    const totalHours =
        selected.reduce(
            (
                total,
                entry
            ) =>
                total +
                Number(
                    entry.hours ||
                    0
                ),

            0
        );


    body.push(
        paragraph(
            'WEEKLY OJT REPORT',
            true
        ),

        paragraph(
            `Student: ${studentName ||
            'Student'
            }`
        ),

        paragraph(
            `Week: ${formatDate(
                bounds[0]
            )} – ${formatDate(
                bounds[1]
            )}`
        ),

        paragraph(
            `Total Rendered Hours: ${fmt(
                totalHours
            )}`
        ),

        paragraph(
            ' '
        )
    );


    let imageIndex =
        0;


    for (
        const entry
        of selected
    ) {

        body.push(

            paragraph(
                `Date: ${formatDate(
                    entry.date
                )}`,
                true
            ),

            paragraph(
                `Task: ${entry.task}`
            ),

            paragraph(
                `Time: ${formatClockTime(
                    entry.timeIn
                )} – ${formatClockTime(
                    entry.timeOut
                )}`
            ),

            paragraph(
                `Break: ${entry.breakMinutes} minutes`
            ),

            paragraph(
                `Rendered Hours: ${fmt(
                    entry.hours
                )}`
            ),

            paragraph(
                `Tasks Accomplished: ${entry.description}`
            )

        );


        if (
            entry.image
        ) {

            imageIndex++;


            const relationId =
                `rId${imageIndex}`;


            const imagePath =
                `media/evidence${imageIndex}.png`;


            files.push(
                [
                    `word/${imagePath}`,

                    base64Bytes(
                        entry.image
                    )
                ]
            );


            relations.push(
                `
                    <Relationship
                        Id="${relationId}"
                        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
                        Target="${imagePath}"
                    />
                `
            );


            body.push(
                paragraph(
                    'Photo Evidence:'
                ),

                imageRun(
                    relationId,
                    imageIndex
                )
            );

        } else {

            body.push(
                paragraph(
                    'Photo Evidence: None'
                )
            );

        }


        body.push(
            paragraph(
                ' '
            )
        );

    }


    const documentXML =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +

        `<w:document
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
        >` +

        `<w:body>` +

        body.join('') +

        `<w:sectPr>

            <w:pgSz
                w:w="12240"
                w:h="15840"
            />

            <w:pgMar
                w:top="1100"
                w:right="1100"
                w:bottom="1100"
                w:left="1100"
            />

        </w:sectPr>` +

        `</w:body>` +

        `</w:document>`;


    const contentTypes =
        `<?xml version="1.0" encoding="UTF-8"?>` +

        `<Types
            xmlns="http://schemas.openxmlformats.org/package/2006/content-types"
        >` +

        `<Default
            Extension="rels"
            ContentType="application/vnd.openxmlformats-package.relationships+xml"
        />` +

        `<Default
            Extension="xml"
            ContentType="application/xml"
        />` +

        `<Default
            Extension="png"
            ContentType="image/png"
        />` +

        `<Override
            PartName="/word/document.xml"
            ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
        />` +

        `</Types>`;


    files.unshift(

        [
            '[Content_Types].xml',
            contentTypes
        ],

        [
            '_rels/.rels',

            `<?xml version="1.0" encoding="UTF-8"?>` +

            `<Relationships
                xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
            >` +

            `<Relationship
                Id="rId1"
                Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
                Target="word/document.xml"
            />` +

            `</Relationships>`
        ],

        [
            'word/document.xml',
            documentXML
        ],

        [
            'word/_rels/document.xml.rels',

            `<?xml version="1.0" encoding="UTF-8"?>` +

            `<Relationships
                xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
            >` +

            relations.join('') +

            `</Relationships>`
        ]

    );


    return zip(
        files
    );

}


/* =================================
   EXPORT WORD REPORT
================================= */

$('exportButton')
    .addEventListener(
        'click',

        () => {

            const selected =
                weekEntries();


            const bounds =
                weekBounds(
                    $('weekDate')
                        .value
                );


            if (
                !selected.length ||
                !bounds
            ) {

                return;

            }


            try {

                const blob =
                    createDocx(
                        selected,
                        bounds
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document
                        .createElement(
                            'a'
                        );


                link.href =
                    url;


                link.download =
                    `OJT_Weekly_Report_${bounds[0]}.docx`;


                document.body
                    .append(
                        link
                    );


                link.click();


                link.remove();


                setTimeout(
                    () => {

                        URL.revokeObjectURL(
                            url
                        );

                    },

                    30000
                );


                toast(
                    'Word report downloaded.'
                );

            } catch (
            error
            ) {

                console.error(
                    error
                );


                toast(
                    'Could not create the Word report.'
                );

            }

        }
    );


/* =================================
   START APPLICATION
================================= */

initialize();