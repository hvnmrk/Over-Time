'use strict';

const $ = id => document.getElementById(id);


/* =====================================================
   DATABASE
===================================================== */

const DB_NAME = 'overtime-pwa-v3';
const STORE_NAME = 'tracker';
const RECORD_KEY = 'current';

let dbPromise;


/* =====================================================
   STATE
===================================================== */

let entries = [];
let attendances = [];

let goal = 486;
let studentName = '';

let editingId = null;

let entryDraft = null;

let entriesCurrentPage = 1;
let entriesPageSize = 10;

let calendarDate = new Date();

let deferredInstallPrompt = null;

let toastTimer;

let reminderAlreadyShown = false;


/* SETTINGS */

let settings = {

    autoBreakEnabled: true,

    autoBreakThreshold: 9,

    autoBreakMinutes: 60,

    reminderEnabled: false,

    reminderTime: '17:00',

    darkMode: false
};


/* =====================================================
   INDEXED DB
===================================================== */

function openDatabase() {

    if (!('indexedDB' in window)) {

        return Promise.reject(
            Error('IndexedDB is not supported.')
        );

    }


    if (!dbPromise) {

        dbPromise = new Promise((resolve, reject) => {

            const request =
                indexedDB.open(DB_NAME, 1);


            request.onupgradeneeded = () => {

                if (
                    !request.result.objectStoreNames
                        .contains(STORE_NAME)
                ) {

                    request.result
                        .createObjectStore(STORE_NAME);

                }

            };


            request.onsuccess =
                () => resolve(request.result);


            request.onerror =
                () => reject(request.error);

        });

    }


    return dbPromise;
}



async function loadData() {

    const db =
        await openDatabase();


    return new Promise((resolve, reject) => {

        const request =
            db.transaction(
                STORE_NAME,
                'readonly'
            )
                .objectStore(STORE_NAME)
                .get(RECORD_KEY);


        request.onsuccess =
            () => resolve(request.result);


        request.onerror =
            () => reject(request.error);

    });

}



async function saveData() {

    const db =
        await openDatabase();


    const state = {

        entries,

        attendances,

        goal,

        studentName,

        settings,

        entryDraft
    };


    await new Promise((resolve, reject) => {

        const transaction =
            db.transaction(
                STORE_NAME,
                'readwrite'
            );


        transaction
            .objectStore(STORE_NAME)
            .put(
                state,
                RECORD_KEY
            );


        transaction.oncomplete = resolve;


        transaction.onerror =
            () => reject(transaction.error);

    });

}


/* =====================================================
   HELPERS
===================================================== */

function escapeHTML(value) {

    return String(value ?? '')
        .replace(
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

    return escapeHTML(value)
        .replace(/\r/g, '');

}



function localDate(date = new Date()) {

    return [
        date.getFullYear(),
        String(date.getMonth() + 1)
            .padStart(2, '0'),
        String(date.getDate())
            .padStart(2, '0')
    ].join('-');

}



function currentTime() {

    const date = new Date();

    return [
        String(date.getHours())
            .padStart(2, '0'),
        String(date.getMinutes())
            .padStart(2, '0')
    ].join(':');

}



function currentMonth() {

    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, '0')}`;

}



function formatDate(value) {

    if (!value) {
        return '—';
    }


    return new Date(
        `${value}T12:00:00`
    )
        .toLocaleDateString(
            'en-PH',
            {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }
        );

}



function formatLongDate(value) {

    if (!value) {
        return '—';
    }


    return new Date(
        `${value}T12:00:00`
    )
        .toLocaleDateString(
            'en-PH',
            {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }
        );

}



function formatClockTime(time) {

    if (!time) {
        return '—';
    }


    const [hour, minute] =
        time.split(':').map(Number);


    return new Date(
        2000,
        0,
        1,
        hour,
        minute
    )
        .toLocaleTimeString(
            'en-PH',
            {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }
        );

}



function fmt(value) {

    return Number(
        Number(value).toFixed(2)
    ).toString();

}



function toast(message) {

    $('toast').textContent = message;

    $('toast')
        .classList
        .add('show');


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            () => {

                $('toast')
                    .classList
                    .remove('show');

            },
            3000
        );

}



function refreshIcons() {

    if (window.lucide) {

        window.lucide.createIcons();

    }

}


/* =====================================================
   INITIALIZATION
===================================================== */

async function initialize() {

    try {

        const stored =
            await loadData();


        entries =
            Array.isArray(stored?.entries)
                ? stored.entries
                : [];


        attendances =
            Array.isArray(stored?.attendances)
                ? stored.attendances
                : [];


        goal =
            Number(stored?.goal) > 0
                ? Number(stored.goal)
                : 468;


        studentName =
            typeof stored?.studentName === 'string'
                ? stored.studentName
                : '';


        settings = {

            ...settings,

            ...(stored?.settings || {})
        };


        entryDraft =
            stored?.entryDraft || null;


        $('weekDate').value =
            localDate();


        $('reportMonth').value =
            currentMonth();


        $('attendanceMonthFilter').value =
            currentMonth();


        updateStudentInfo();

        updateSettingsForm();

        applyDarkMode();

        render();

        updateConnectionStatus();

        registerPWA();

        checkReminder();


        setInterval(
            checkReminder,
            60000
        );


        refreshIcons();

    } catch (error) {

        console.error(error);

        toast(
            'Could not open local data.'
        );

    }

}


/* =====================================================
   USER
===================================================== */

function updateStudentInfo() {

    const name =
        studentName || 'Student';


    $('profileName')
        .textContent =
        name;


    $('profileAvatar')
        .textContent =
        studentName

            ? studentName
                .split(/\s+/)
                .filter(Boolean)
                .map(item => item[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

            : 'S';


    $('studentName').value =
        studentName;


    $('hoursGoal').value =
        goal;

}


/* =====================================================
   NAVIGATION
===================================================== */

function closeMenu() {

    $('sidebar')
        .classList
        .remove('open');


    $('backdrop').hidden = true;

}



$('menuButton')
    .addEventListener(
        'click',
        () => {

            const open =
                $('sidebar')
                    .classList
                    .toggle('open');


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

    const pages = {

        overview: 'Dashboard',

        calendar: 'Calendar',

        attendance: 'Attendance',

        entries: 'Daily Logs',

        reports: 'Reports',

        settings: 'Settings'
    };


    if (!pages[page]) {
        return;
    }


    document
        .querySelectorAll('.page')
        .forEach(element => {

            element.classList.toggle(
                'active',
                element.id === page
            );

        });


    document
        .querySelectorAll('.nav-link')
        .forEach(element => {

            element.classList.toggle(
                'active',
                element.dataset.page === page
            );

        });


    $('pageTitle')
        .textContent =
        pages[page];


    if (page === 'calendar') {
        renderCalendar();
    }


    if (page === 'attendance') {
        renderAttendanceHistory();
    }


    closeMenu();


    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });


    refreshIcons();

}


/* =====================================================
   TIME CALCULATIONS
===================================================== */

function getShiftMinutes(start, end) {

    if (!start || !end) {
        return null;
    }


    const [sh, sm] =
        start.split(':').map(Number);


    const [eh, em] =
        end.split(':').map(Number);


    const result =
        (eh * 60 + em) -
        (sh * 60 + sm);


    return result > 0
        ? result
        : null;

}



function getAutomaticBreak(start, end) {

    if (!settings.autoBreakEnabled) {
        return null;
    }


    const duration =
        getShiftMinutes(
            start,
            end
        );


    if (duration === null) {
        return null;
    }


    if (
        duration >=
        settings.autoBreakThreshold * 60
    ) {

        return Number(
            settings.autoBreakMinutes
        );

    }


    return 0;

}



function applyAutomaticBreak() {

    const automaticBreak =
        getAutomaticBreak(
            $('timeIn').value,
            $('timeOut').value
        );


    if (automaticBreak === null) {

        $('autoBreakNote')
            .textContent =
            '';

        return;

    }


    $('breakMinutes').value =
        automaticBreak;


    if (automaticBreak > 0) {

        $('autoBreakNote')
            .textContent =
            `Automatic break applied: ${automaticBreak} minutes.`;

    } else {

        $('autoBreakNote')
            .textContent =
            'No automatic break is required for this shift.';

    }

}



function calculateHours(
    start,
    end,
    breakValue
) {

    const duration =
        getShiftMinutes(
            start,
            end
        );


    if (duration === null) {
        return null;
    }


    const breakMinutes =
        Number(breakValue);


    if (
        !Number.isFinite(breakMinutes) ||
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
            ) /
            60
        ) *
        100
    ) / 100;

}



function updatePreview() {

    if (
        settings.autoBreakEnabled &&
        $('timeIn').value &&
        $('timeOut').value
    ) {

        applyAutomaticBreak();

    }


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
    'timeOut'
]
    .forEach(id => {

        $(id).addEventListener(
            'input',
            updatePreview
        );

    });


$('breakMinutes')
    .addEventListener(
        'input',
        () => {

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
    );



$('timeInNow')
    .addEventListener(
        'click',
        () => {

            $('entryDate').value =
                localDate();

            $('timeIn').value =
                currentTime();

            updatePreview();

        }
    );



$('timeOutNow')
    .addEventListener(
        'click',
        () => {

            $('timeOut').value =
                currentTime();

            updatePreview();

        }
    );


/* =====================================================
   ATTENDANCE
===================================================== */

function attendanceForDate(date) {

    return attendances.find(
        attendance =>
            attendance.date === date
    );

}



function entryForDate(date) {

    return entries.find(
        entry =>
            entry.date === date
    );

}



$('quickTimeIn')
    .addEventListener(
        'click',
        async () => {

            const date =
                localDate();


            let attendance =
                attendanceForDate(date);


            if (attendance?.timeIn) {

                toast(
                    'You already timed in today.'
                );

                return;

            }


            if (!attendance) {

                attendance = {

                    id:
                        crypto.randomUUID(),

                    date,

                    timeIn:
                        currentTime(),

                    timeOut:
                        '',

                    createdAt:
                        Date.now()
                };


                attendances.unshift(
                    attendance
                );

            } else {

                attendance.timeIn =
                    currentTime();

            }


            await saveData();

            render();

            toast(
                `Timed in at ${formatClockTime(
                    attendance.timeIn
                )}.`
            );

        }
    );



$('quickTimeOut')
    .addEventListener(
        'click',
        async () => {

            const attendance =
                attendanceForDate(
                    localDate()
                );


            if (
                !attendance ||
                !attendance.timeIn
            ) {

                toast(
                    'Time in first.'
                );

                return;

            }


            if (attendance.timeOut) {

                toast(
                    'You already timed out.'
                );

                return;

            }


            const confirmed =
                confirm(
                    `Time out now at ${formatClockTime(
                        currentTime()
                    )}?`
                );


            if (!confirmed) {
                return;
            }


            attendance.timeOut =
                currentTime();


            await saveData();

            render();


            openForm();


            $('entryDate').value =
                attendance.date;


            $('timeIn').value =
                attendance.timeIn;


            $('timeOut').value =
                attendance.timeOut;


            updatePreview();


            toast(
                'Time out recorded. Complete your daily log.'
            );

        }
    );



function renderTodayAttendance() {

    const today =
        localDate();


    const attendance =
        attendanceForDate(today);


    $('attendanceDate')
        .textContent =
        formatLongDate(today);


    const warning =
        $('attendanceWarning');


    warning.hidden = true;


    if (!attendance) {

        $('attendanceStatus')
            .textContent =
            'You haven\'t timed in yet.';


        $('attendanceTimes')
            .innerHTML =
            '';


        $('quickTimeIn').disabled =
            false;


        $('quickTimeOut').disabled =
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


        $('quickTimeIn').disabled =
            true;


        $('quickTimeOut').disabled =
            false;


        warning.hidden = false;


        $('attendanceWarningText')
            .textContent =
            `You timed in at ${formatClockTime(
                attendance.timeIn
            )} but have not timed out yet.`;


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


    $('quickTimeIn').disabled =
        true;


    $('quickTimeOut').disabled =
        true;

}


/* ATTENDANCE HISTORY */

function renderAttendanceHistory() {

    const filter =
        $('attendanceMonthFilter').value;


    let selected =
        [...attendances]
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date)
            );


    if (filter) {

        selected =
            selected.filter(
                attendance =>
                    attendance.date.startsWith(
                        filter
                    )
            );

    }


    if (!selected.length) {

        $('attendanceHistory')
            .innerHTML = `

                <div class="empty">
                    No attendance records found.
                </div>
            `;

        return;

    }


    $('attendanceHistory')
        .innerHTML =
        selected.map(
            attendance => `

                <article class="
                    attendance-record
                    ${!attendance.timeOut
                    ? 'incomplete'
                    : ''
                }
                ">

                    <div>

                        <strong>
                            ${formatDate(
                    attendance.date
                )}
                        </strong>

                        <small>
                            ${attendance.timeOut
                    ? 'Complete'
                    : 'Incomplete attendance'
                }
                        </small>

                    </div>


                    <div class="attendance-time-value">

                        <span>
                            TIME IN
                        </span>

                        ${formatClockTime(
                    attendance.timeIn
                )}

                    </div>


                    <div class="attendance-time-value">

                        <span>
                            TIME OUT
                        </span>

                        ${formatClockTime(
                    attendance.timeOut
                )}

                    </div>


                    <button
                        class="attendance-edit-button"
                        data-edit-attendance="${attendance.id}"
                        type="button"
                    >
                        Edit
                    </button>

                </article>
            `
        ).join('');

}



$('attendanceMonthFilter')
    .addEventListener(
        'change',
        renderAttendanceHistory
    );


$('clearAttendanceMonth')
    .addEventListener(
        'click',
        () => {

            $('attendanceMonthFilter').value =
                '';

            renderAttendanceHistory();

        }
    );



function openAttendanceEdit(id) {

    const attendance =
        attendances.find(
            item => item.id === id
        );


    if (!attendance) {
        return;
    }


    $('attendanceEditId').value =
        attendance.id;


    $('attendanceEditDate').value =
        attendance.date;


    $('attendanceEditTimeIn').value =
        attendance.timeIn || '';


    $('attendanceEditTimeOut').value =
        attendance.timeOut || '';


    $('attendanceDialog')
        .showModal();

}



$('attendanceForm')
    .addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const attendance =
                attendances.find(
                    item =>
                        item.id ===
                        $('attendanceEditId').value
                );


            if (!attendance) {
                return;
            }


            attendance.date =
                $('attendanceEditDate').value;


            attendance.timeIn =
                $('attendanceEditTimeIn').value;


            attendance.timeOut =
                $('attendanceEditTimeOut').value;


            await saveData();


            $('attendanceDialog')
                .close();


            render();


            toast(
                'Attendance updated.'
            );

        }
    );


$('closeAttendanceDialog')
    .addEventListener(
        'click',
        () =>
            $('attendanceDialog')
                .close()
    );


$('cancelAttendanceEdit')
    .addEventListener(
        'click',
        () =>
            $('attendanceDialog')
                .close()
    );


/* =====================================================
   DASHBOARD RENDER
===================================================== */

function sortedEntries() {

    return [...entries]
        .sort(
            (a, b) =>
                b.date.localeCompare(a.date) ||
                Number(b.createdAt || 0) -
                Number(a.createdAt || 0)
        );

}



function render() {

    const total =
        entries.reduce(
            (sum, entry) =>
                sum +
                Number(entry.hours || 0),
            0
        );


    const remaining =
        Math.max(
            0,
            goal - total
        );


    const percentage =
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


    $('renderedHours').textContent =
        fmt(total);


    $('requiredHours').textContent =
        fmt(goal);


    $('entryCount').textContent =
        entries.length;


    $('remainingHours').textContent =
        `${fmt(remaining)} hours to go`;


    $('percentage').textContent =
        `${percentage}%`;


    $('goalProgress').value =
        percentage;


    $('progressRendered').textContent =
        `${fmt(total)} rendered`;


    $('progressRemaining').textContent =
        `${fmt(remaining)} remaining`;


    renderRecentEntries();

    renderTodayAttendance();

    renderMonthSummary();

    renderEntries();

    renderCalendar();

    renderAttendanceHistory();

    renderWeeklyReport();

    renderMonthlyReport();


    refreshIcons();

}



function renderRecentEntries() {

    const recent =
        sortedEntries()
            .slice(0, 3);


    $('recentEntries')
        .innerHTML =
        recent.length

            ? recent.map(
                entry => `

                    <button
                        class="recent-item"
                        data-detail="${entry.id}"
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
            ).join('')

            : `
                <div class="empty">
                    Your first work day starts here.
                </div>
            `;

}



function renderMonthSummary() {

    const month =
        currentMonth();


    $('monthLogCount')
        .textContent =
        entries.filter(
            item =>
                item.date.startsWith(month)
        ).length;


    const monthlyAttendance =
        attendances.filter(
            item =>
                item.date.startsWith(month)
        );


    $('monthAttendanceCount')
        .textContent =
        monthlyAttendance.length;


    $('monthIncompleteCount')
        .textContent =
        monthlyAttendance.filter(
            item =>
                !item.timeOut
        ).length;

}


/* =====================================================
   CALENDAR
===================================================== */

$('calendarPrevious')
    .addEventListener(
        'click',
        () => {

            calendarDate =
                new Date(
                    calendarDate.getFullYear(),
                    calendarDate.getMonth() - 1,
                    1
                );


            renderCalendar();

        }
    );


$('calendarNext')
    .addEventListener(
        'click',
        () => {

            calendarDate =
                new Date(
                    calendarDate.getFullYear(),
                    calendarDate.getMonth() + 1,
                    1
                );


            renderCalendar();

        }
    );


$('calendarToday')
    .addEventListener(
        'click',
        () => {

            calendarDate =
                new Date();


            renderCalendar();

        }
    );



function calendarDayState(date) {

    const attendance =
        attendanceForDate(date);


    const log =
        entryForDate(date);


    if (
        attendance &&
        !attendance.timeOut
    ) {

        return {
            className: 'incomplete',
            text: 'Incomplete'
        };

    }


    if (
        attendance &&
        log
    ) {

        return {
            className: 'complete',
            text: 'Completed'
        };

    }


    if (attendance) {

        return {
            className: 'attendance-only',
            text: 'Attendance'
        };

    }


    if (log) {

        return {
            className: 'log-only',
            text: 'Daily log'
        };

    }


    return null;

}



function renderCalendar() {

    const year =
        calendarDate.getFullYear();


    const month =
        calendarDate.getMonth();


    $('calendarTitle')
        .textContent =
        calendarDate
            .toLocaleDateString(
                'en-PH',
                {
                    month: 'long',
                    year: 'numeric'
                }
            );


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const gridStart =
        new Date(
            year,
            month,
            1 - firstDay.getDay()
        );


    let html = '';


    for (
        let index = 0;
        index < 42;
        index++
    ) {

        const date =
            new Date(gridStart);


        date.setDate(
            gridStart.getDate() +
            index
        );


        const dateString =
            localDate(date);


        const outside =
            date.getMonth() !== month;


        const today =
            dateString === localDate();


        const state =
            calendarDayState(
                dateString
            );


        html += `

            <button
                class="
                    calendar-day
                    ${outside ? 'outside' : ''}
                    ${today ? 'today' : ''}
                "
                data-calendar-date="${dateString}"
                type="button"
            >

                <span class="calendar-date-number">
                    ${date.getDate()}
                </span>


                <div class="calendar-day-status">

                    ${state
                ? `
                                <span class="
                                    calendar-status-item
                                    ${state.className}
                                ">
                                    ${state.text}
                                </span>
                            `
                : ''
            }

                </div>

            </button>
        `;

    }


    $('calendarGrid')
        .innerHTML =
        html;

}



function openCalendarDay(date) {

    const attendance =
        attendanceForDate(date);


    const logs =
        entries.filter(
            item =>
                item.date === date
        );


    $('calendarDayTitle')
        .textContent =
        formatLongDate(date);


    let html = '';


    if (attendance) {

        html += `

            <h3>
                Attendance
            </h3>

            <p class="entry-meta">

                Time In:
                ${formatClockTime(
            attendance.timeIn
        )}

                <br>

                Time Out:
                ${formatClockTime(
            attendance.timeOut
        )}

            </p>
        `;

    }


    if (logs.length) {

        html += `

            <h3>
                Daily Logs
            </h3>
        `;


        html += logs.map(
            entry => `

                <div class="report-preview-item">

                    <strong>
                        ${escapeHTML(
                entry.task
            )}
                    </strong>

                    <span>
                        ${fmt(
                entry.hours
            )} hours
                    </span>

                    <span>
                        ${escapeHTML(
                entry.description
            )}
                    </span>

                </div>
            `
        ).join('');

    }


    if (!attendance && !logs.length) {

        html = `

            <div class="empty">
                No attendance or daily log
                recorded for this date.
            </div>
        `;

    }


    $('calendarDayContent')
        .innerHTML =
        html;


    $('calendarDayDialog')
        .showModal();

}



$('closeCalendarDay')
    .addEventListener(
        'click',
        () =>
            $('calendarDayDialog')
                .close()
    );


/* =====================================================
   DAILY LOG FILTER / PAGINATION
===================================================== */

function getFilteredEntries() {

    const query =
        $('search')
            .value
            .trim()
            .toLowerCase();


    const from =
        $('filterDateFrom').value;


    const to =
        $('filterDateTo').value;


    const sort =
        $('entrySort').value;


    let filtered =
        entries.filter(entry => {

            const text =
                [
                    entry.date,
                    entry.task,
                    entry.description
                ]
                    .join(' ')
                    .toLowerCase();


            return (

                (
                    !query ||
                    text.includes(query)
                )

                &&

                (
                    !from ||
                    entry.date >= from
                )

                &&

                (
                    !to ||
                    entry.date <= to
                )

            );

        });


    filtered.sort((a, b) => {

        switch (sort) {

            case 'oldest':

                return a.date.localeCompare(
                    b.date
                );


            case 'hours-high':

                return Number(b.hours) -
                    Number(a.hours);


            case 'hours-low':

                return Number(a.hours) -
                    Number(b.hours);


            case 'task-az':

                return a.task.localeCompare(
                    b.task
                );


            default:

                return b.date.localeCompare(
                    a.date
                );

        }

    });


    return filtered;

}



function renderEntries() {

    entriesPageSize =
        Number(
            $('entriesPerPage').value
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


    entriesCurrentPage =
        Math.min(
            Math.max(
                1,
                entriesCurrentPage
            ),
            totalPages
        );


    const start =
        (
            entriesCurrentPage - 1
        ) *
        entriesPageSize;


    const selected =
        filtered.slice(
            start,
            start +
            entriesPageSize
        );


    if (!selected.length) {

        $('entriesList')
            .innerHTML = `

                <div class="empty">
                    ${entries.length
                ? 'No entries match your filters.'
                : 'No daily logs yet.'
            }
                </div>
            `;

    } else {

        $('entriesList')
            .innerHTML =
            selected.map(
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
                        ? '📷'
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
                                data-detail="${entry.id}"
                                type="button"
                            >
                                View Details
                            </button>

                            <button
                                data-edit="${entry.id}"
                                type="button"
                            >
                                Edit
                            </button>

                        </div>

                    </article>
                `
            ).join('');

    }


    renderPagination(
        filtered.length,
        totalPages
    );

}



function renderPagination(
    totalEntries,
    totalPages
) {

    if (
        totalEntries === 0 ||
        totalPages <= 1
    ) {

        $('entryPagination')
            .innerHTML =
            '';

        return;

    }


    let html = `

        <button
            data-page-number="${entriesCurrentPage - 1
        }"
            ${entriesCurrentPage === 1
            ? 'disabled'
            : ''
        }
        >
            Previous
        </button>
    `;


    const pages = [];


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        if (
            page === 1 ||
            page === totalPages ||
            Math.abs(
                page -
                entriesCurrentPage
            ) <= 1
        ) {

            pages.push(page);

        }

    }


    let previous = 0;


    pages.forEach(page => {

        if (
            previous &&
            page - previous > 1
        ) {

            html += `
                <span class="pagination-info">
                    …
                </span>
            `;

        }


        html += `

            <button
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


        previous = page;

    });


    html += `

        <button
            data-page-number="${entriesCurrentPage + 1
        }"
            ${entriesCurrentPage === totalPages
            ? 'disabled'
            : ''
        }
        >
            Next
        </button>
    `;


    $('entryPagination')
        .innerHTML =
        html;

}



function resetEntryPage() {

    entriesCurrentPage = 1;

    renderEntries();

}



[
    'filterDateFrom',
    'filterDateTo',
    'entrySort',
    'entriesPerPage'
]
    .forEach(id => {

        $(id).addEventListener(
            'change',
            resetEntryPage
        );

    });


$('search')
    .addEventListener(
        'input',
        resetEntryPage
    );


$('clearEntryFilters')
    .addEventListener(
        'click',
        () => {

            $('search').value = '';

            $('filterDateFrom').value = '';

            $('filterDateTo').value = '';

            $('entrySort').value =
                'newest';

            $('entriesPerPage').value =
                '10';

            entriesCurrentPage = 1;

            renderEntries();

        }
    );


/* =====================================================
   ENTRY FORM + DRAFT
===================================================== */

function openForm(id = null) {

    const entry =
        entries.find(
            item => item.id === id
        );


    editingId =
        entry?.id || null;


    $('entryForm').reset();


    $('formError').textContent = '';

    $('draftStatus').textContent = '';


    $('formTitle').textContent =
        entry
            ? 'Edit Entry'
            : 'New Entry';


    if (entry) {

        $('entryDate').value =
            entry.date;


        $('task').value =
            entry.task;


        $('timeIn').value =
            entry.timeIn;


        $('timeOut').value =
            entry.timeOut;


        $('breakMinutes').value =
            entry.breakMinutes;


        $('description').value =
            entry.description;


        $('attachmentNote').textContent =
            entry.image
                ? 'Existing photo will be kept unless replaced.'
                : '';

    } else if (entryDraft) {

        $('entryDate').value =
            entryDraft.date || localDate();


        $('task').value =
            entryDraft.task || '';


        $('timeIn').value =
            entryDraft.timeIn || '';


        $('timeOut').value =
            entryDraft.timeOut || '';


        $('breakMinutes').value =
            entryDraft.breakMinutes ?? 60;


        $('description').value =
            entryDraft.description || '';


        $('draftStatus').textContent =
            'Draft restored.';

    } else {

        const attendance =
            attendanceForDate(
                localDate()
            );


        $('entryDate').value =
            localDate();


        $('timeIn').value =
            attendance?.timeIn || '';


        $('timeOut').value =
            attendance?.timeOut || '';


        $('breakMinutes').value =
            60;

    }


    updatePreview();


    $('entryDialog')
        .showModal();

}



function getDraftFromForm() {

    return {

        date:
            $('entryDate').value,

        task:
            $('task').value,

        timeIn:
            $('timeIn').value,

        timeOut:
            $('timeOut').value,

        breakMinutes:
            Number(
                $('breakMinutes').value
            ),

        description:
            $('description').value

    };

}



$('saveDraftButton')
    .addEventListener(
        'click',
        async () => {

            entryDraft =
                getDraftFromForm();


            await saveData();


            $('draftStatus')
                .textContent =
                'Draft saved.';


            toast(
                'Draft saved.'
            );

        }
    );


/* IMAGE COMPRESSION */

function compressImage(file) {

    return new Promise((resolve, reject) => {

        const reader =
            new FileReader();


        reader.onload = () => {

            const image =
                new Image();


            image.onload = () => {

                const maxSize = 1200;


                const scale =
                    Math.min(
                        1,
                        maxSize /
                        Math.max(
                            image.width,
                            image.height
                        )
                    );


                const canvas =
                    document.createElement(
                        'canvas'
                    );


                canvas.width =
                    Math.round(
                        image.width *
                        scale
                    );


                canvas.height =
                    Math.round(
                        image.height *
                        scale
                    );


                canvas
                    .getContext('2d')
                    .drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );


                resolve(
                    canvas.toDataURL(
                        'image/jpeg',
                        .78
                    )
                );

            };


            image.onerror =
                reject;


            image.src =
                reader.result;

        };


        reader.onerror =
            reject;


        reader.readAsDataURL(
            file
        );

    });

}



$('entryForm')
    .addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const hours =
                calculateHours(
                    $('timeIn').value,
                    $('timeOut').value,
                    $('breakMinutes').value
                );


            if (hours === null) {

                $('formError')
                    .textContent =
                    'Check your time in, time out, and break.';

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


            if (!task || !description) {

                $('formError')
                    .textContent =
                    'Enter a task and description.';

                return;

            }


            const oldEntry =
                entries.find(
                    item =>
                        item.id === editingId
                );


            const file =
                $('evidence').files[0];


            let image =
                oldEntry?.image || null;


            if (file) {

                image =
                    await compressImage(
                        file
                    );

            }


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
                        $('breakMinutes').value
                    ),

                hours,

                image
            };


            if (oldEntry) {

                entries =
                    entries.map(
                        item =>
                            item.id ===
                                oldEntry.id

                                ? record

                                : item
                    );

            } else {

                entries.unshift(
                    record
                );

            }


            entryDraft = null;


            await saveData();


            $('entryDialog')
                .close();


            render();


            toast(
                oldEntry
                    ? 'Entry updated.'
                    : 'Entry saved.'
            );

        }
    );



function openDetail(id) {

    const entry =
        entries.find(
            item => item.id === id
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
                    data-edit="${entry.id}"
                    type="button"
                >
                    Edit
                </button>

                <button
                    class="danger"
                    data-delete="${entry.id}"
                    type="button"
                >
                    Delete
                </button>

            </div>
        `;


    $('detailDialog')
        .showModal();

}



async function deleteEntry(id) {

    if (
        !confirm(
            'Delete this entry permanently?'
        )
    ) {
        return;
    }


    entries =
        entries.filter(
            entry =>
                entry.id !== id
        );


    await saveData();


    $('detailDialog')
        .close();


    render();


    toast(
        'Entry deleted.'
    );

}



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


/* =====================================================
   REPORTS
===================================================== */

function weekBounds(value) {

    const date =
        new Date(
            `${value ||
            localDate()
            }T12:00:00`
        );


    const offset =
        (
            date.getDay() +
            6
        ) % 7;


    date.setDate(
        date.getDate() -
        offset
    );


    const monday =
        localDate(date);


    date.setDate(
        date.getDate() +
        6
    );


    return [
        monday,
        localDate(date)
    ];

}



function weekEntries() {

    const [start, end] =
        weekBounds(
            $('weekDate').value
        );


    return [...entries]
        .filter(
            entry =>
                entry.date >= start &&
                entry.date <= end
        )
        .sort(
            (a, b) =>
                a.date.localeCompare(
                    b.date
                )
        );

}



function monthEntries(month) {

    return [...entries]
        .filter(
            entry =>
                entry.date.startsWith(
                    month
                )
        )
        .sort(
            (a, b) =>
                a.date.localeCompare(
                    b.date
                )
        );

}



function renderReportItems(
    selected
) {

    if (!selected.length) {

        return `
            <div class="empty">
                No entries found.
            </div>
        `;

    }


    return selected.map(
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

            </article>
        `
    ).join('');

}



function renderWeeklyReport() {

    const bounds =
        weekBounds(
            $('weekDate').value
        );


    $('weekRange')
        .textContent =
        `${formatDate(
            bounds[0]
        )} – ${formatDate(
            bounds[1]
        )}`;


    $('reportPreview')
        .innerHTML =
        renderReportItems(
            weekEntries()
        );

}



function renderMonthlyReport() {

    const selected =
        monthEntries(
            $('reportMonth').value
        );


    const total =
        selected.reduce(
            (sum, entry) =>
                sum +
                Number(entry.hours || 0),
            0
        );


    $('monthlyReportTotal')
        .textContent =
        `${fmt(total)} hours`;


    $('monthlyReportPreview')
        .innerHTML =
        renderReportItems(
            selected
        );

}



$('weekDate')
    .addEventListener(
        'change',
        renderWeeklyReport
    );


$('reportMonth')
    .addEventListener(
        'change',
        renderMonthlyReport
    );


document
    .querySelectorAll(
        '.report-tab'
    )
    .forEach(button => {

        button.addEventListener(
            'click',
            () => {

                document
                    .querySelectorAll(
                        '.report-tab'
                    )
                    .forEach(item =>
                        item.classList.remove(
                            'active'
                        )
                    );


                document
                    .querySelectorAll(
                        '.report-section'
                    )
                    .forEach(item =>
                        item.classList.remove(
                            'active'
                        )
                    );


                button.classList.add(
                    'active'
                );


                const tab =
                    button.dataset.reportTab;


                $(
                    tab === 'weekly'

                        ? 'weeklyReportSection'

                        : 'monthlyReportSection'
                )
                    .classList
                    .add('active');

            }
        );

    });


/* CSV */

function csvEscape(value) {

    return `"${String(
        value ?? ''
    ).replace(
        /"/g,
        '""'
    )}"`;

}



function exportCsv(
    selected,
    filename
) {

    if (!selected.length) {

        toast(
            'There are no entries to export.'
        );

        return;

    }


    const rows = [

        [
            'Date',
            'Task',
            'Time In',
            'Time Out',
            'Break Minutes',
            'Rendered Hours',
            'Description'
        ],

        ...selected.map(
            entry => [

                entry.date,

                entry.task,

                entry.timeIn,

                entry.timeOut,

                entry.breakMinutes,

                entry.hours,

                entry.description
            ]
        )

    ];


    const csv =
        rows
            .map(row =>
                row
                    .map(csvEscape)
                    .join(',')
            )
            .join('\n');


    downloadBlob(
        new Blob(
            [csv],
            {
                type:
                    'text/csv;charset=utf-8'
            }
        ),
        filename
    );

}



$('exportWeeklyCsv')
    .addEventListener(
        'click',
        () =>
            exportCsv(
                weekEntries(),
                'OJT_Weekly_Report.csv'
            )
    );


$('exportMonthlyCsv')
    .addEventListener(
        'click',
        () =>
            exportCsv(
                monthEntries(
                    $('reportMonth').value
                ),
                'OJT_Monthly_Report.csv'
            )
    );


/* PRINT / PDF */

function printReport(
    title,
    selected
) {

    if (!selected.length) {

        toast(
            'There are no entries to print.'
        );

        return;

    }


    const total =
        selected.reduce(
            (sum, entry) =>
                sum +
                Number(entry.hours || 0),
            0
        );


    const rows =
        selected.map(
            entry => `

                <tr>

                    <td>
                        ${formatDate(
                entry.date
            )}
                    </td>

                    <td>
                        ${escapeHTML(
                entry.task
            )}
                    </td>

                    <td>
                        ${formatClockTime(
                entry.timeIn
            )}
                    </td>

                    <td>
                        ${formatClockTime(
                entry.timeOut
            )}
                    </td>

                    <td>
                        ${fmt(
                entry.hours
            )}
                    </td>

                    <td>
                        ${escapeHTML(
                entry.description
            )}
                    </td>

                </tr>
            `
        ).join('');


    const printWindow =
        window.open(
            '',
            '_blank'
        );


    printWindow.document.write(`

        <!doctype html>

        <html>

        <head>

            <title>${title}</title>

            <style>

                body {
                    font-family:
                        Arial,
                        sans-serif;

                    padding: 35px;

                    color: #222;
                }

                h1 {
                    margin-bottom: 5px;
                }

                table {
                    width: 100%;

                    border-collapse: collapse;

                    margin-top: 25px;
                }

                th,
                td {
                    border: 1px solid #ccc;

                    padding: 8px;

                    font-size: 11px;

                    text-align: left;

                    vertical-align: top;
                }

                th {
                    background: #eee;
                }

                @media print {

                    body {
                        padding: 0;
                    }

                }

            </style>

        </head>

        <body>

            <h1>${title}</h1>

            <p>
                Student:
                ${escapeHTML(
        studentName || 'Student'
    )}
            </p>

            <p>
                Total Rendered Hours:
                ${fmt(total)}
            </p>

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Task</th>
                        <th>Time In</th>
                        <th>Time Out</th>
                        <th>Hours</th>
                        <th>Description</th>

                    </tr>

                </thead>

                <tbody>

                    ${rows}

                </tbody>

            </table>

            <script>
                window.onload = () => {
                    window.print();
                };
            <\/script>

        </body>

        </html>
    `);


    printWindow.document.close();

}



$('printWeeklyButton')
    .addEventListener(
        'click',
        () =>
            printReport(
                'Weekly OJT Report',
                weekEntries()
            )
    );


$('printMonthlyButton')
    .addEventListener(
        'click',
        () =>
            printReport(
                'Monthly OJT Report',
                monthEntries(
                    $('reportMonth').value
                )
            )
    );


/* =====================================================
   WORD DOCX
===================================================== */

const utf8 =
    text =>
        new TextEncoder()
            .encode(text);



function u16(number) {

    return [
        number & 255,
        number >>> 8 & 255
    ];

}



function u32(number) {

    return [
        number & 255,
        number >>> 8 & 255,
        number >>> 16 & 255,
        number >>> 24 & 255
    ];

}



const crcTable =
    Array.from(
        {
            length: 256
        },
        (_, value) => {

            let number = value;


            for (
                let index = 0;
                index < 8;
                index++
            ) {

                number =
                    number & 1

                        ? 0xedb88320 ^
                        number >>> 1

                        : number >>> 1;

            }


            return number >>> 0;

        }
    );



function crc32(bytes) {

    let crc =
        0xffffffff;


    for (const byte of bytes) {

        crc =
            crcTable[
            (
                crc ^
                byte
            ) &
            255
            ] ^
            crc >>> 8;

    }


    return (
        crc ^
        0xffffffff
    ) >>> 0;

}



function zip(files) {

    const parts = [];
    const central = [];

    let offset = 0;


    for (
        const [
            path,
            data
        ]
        of files
    ) {

        const name =
            utf8(path);


        const bytes =
            typeof data === 'string'
                ? utf8(data)
                : data;


        const crc =
            crc32(bytes);


        const local =
            new Uint8Array([

                ...u32(0x04034b50),

                ...u16(20),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u32(crc),

                ...u32(bytes.length),

                ...u32(bytes.length),

                ...u16(name.length),

                ...u16(0),

                ...name
            ]);


        parts.push(
            local,
            bytes
        );


        central.push(
            new Uint8Array([

                ...u32(0x02014b50),

                ...u16(20),

                ...u16(20),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u32(crc),

                ...u32(bytes.length),

                ...u32(bytes.length),

                ...u16(name.length),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u16(0),

                ...u32(0),

                ...u32(offset),

                ...name
            ])
        );


        offset +=
            local.length +
            bytes.length;

    }


    const centralSize =
        central.reduce(
            (sum, item) =>
                sum +
                item.length,
            0
        );


    const end =
        new Uint8Array([

            ...u32(0x06054b50),

            ...u16(0),

            ...u16(0),

            ...u16(files.length),

            ...u16(files.length),

            ...u32(centralSize),

            ...u32(offset),

            ...u16(0)
        ]);


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



function createDocx(selected) {

    const body = [];


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
            `Total Rendered Hours: ${fmt(
                selected.reduce(
                    (sum, entry) =>
                        sum +
                        Number(entry.hours || 0),
                    0
                )
            )}`
        ),

        paragraph(' ')

    );


    selected.forEach(entry => {

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
                )} - ${formatClockTime(
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
                `Description: ${entry.description}`
            ),

            paragraph(' ')

        );

    });


    const documentXML = `

        <?xml version="1.0"
            encoding="UTF-8"
            standalone="yes"?>

        <w:document
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        >

            <w:body>

                ${body.join('')}

                <w:sectPr>

                    <w:pgSz
                        w:w="12240"
                        w:h="15840"
                    />

                </w:sectPr>

            </w:body>

        </w:document>
    `;


    const types = `

        <?xml version="1.0"
            encoding="UTF-8"?>

        <Types
            xmlns="http://schemas.openxmlformats.org/package/2006/content-types"
        >

            <Default
                Extension="rels"
                ContentType="application/vnd.openxmlformats-package.relationships+xml"
            />

            <Default
                Extension="xml"
                ContentType="application/xml"
            />

            <Override
                PartName="/word/document.xml"
                ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
            />

        </Types>
    `;


    return zip([

        [
            '[Content_Types].xml',
            types
        ],

        [
            '_rels/.rels',

            `<?xml version="1.0"
                encoding="UTF-8"?>

            <Relationships
                xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
            >

                <Relationship
                    Id="rId1"
                    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
                    Target="word/document.xml"
                />

            </Relationships>`
        ],

        [
            'word/document.xml',
            documentXML
        ],

        [
            'word/_rels/document.xml.rels',

            `<?xml version="1.0"
                encoding="UTF-8"?>

            <Relationships
                xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
            ></Relationships>`
        ]

    ]);

}



$('exportWordButton')
    .addEventListener(
        'click',
        () => {

            const selected =
                weekEntries();


            if (!selected.length) {

                toast(
                    'There are no entries to export.'
                );

                return;

            }


            downloadBlob(
                createDocx(selected),
                'OJT_Weekly_Report.docx'
            );

        }
    );


/* =====================================================
   DOWNLOAD
===================================================== */

function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement('a');


    link.href = url;

    link.download =
        filename;


    document.body.append(link);

    link.click();

    link.remove();


    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        30000
    );

}


/* =====================================================
   SETTINGS
===================================================== */

function updateSettingsForm() {

    $('autoBreakEnabled').checked =
        settings.autoBreakEnabled;


    $('autoBreakThreshold').value =
        settings.autoBreakThreshold;


    $('autoBreakMinutes').value =
        settings.autoBreakMinutes;


    $('reminderEnabled').checked =
        settings.reminderEnabled;


    $('reminderTime').value =
        settings.reminderTime;


    $('darkModeToggle').checked =
        settings.darkMode;

}



$('settingsForm')
    .addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            studentName =
                $('studentName')
                    .value
                    .trim();


            goal =
                Number(
                    $('hoursGoal').value
                );


            settings.autoBreakEnabled =
                $('autoBreakEnabled').checked;


            settings.autoBreakThreshold =
                Number(
                    $('autoBreakThreshold')
                        .value
                );


            settings.autoBreakMinutes =
                Number(
                    $('autoBreakMinutes')
                        .value
                );


            settings.reminderEnabled =
                $('reminderEnabled').checked;


            settings.reminderTime =
                $('reminderTime').value;


            settings.darkMode =
                $('darkModeToggle').checked;


            if (
                settings.reminderEnabled &&
                'Notification' in window &&
                Notification.permission === 'default'
            ) {

                await Notification
                    .requestPermission();

            }


            await saveData();


            updateStudentInfo();

            applyDarkMode();

            render();


            toast(
                'Settings saved.'
            );

        }
    );



function applyDarkMode() {

    document.body
        .classList
        .toggle(
            'dark',
            Boolean(
                settings.darkMode
            )
        );

}


/* =====================================================
   REMINDER
===================================================== */

function checkReminder() {

    if (
        !settings.reminderEnabled ||
        reminderAlreadyShown
    ) {
        return;
    }


    const attendance =
        attendanceForDate(
            localDate()
        );


    if (
        !attendance ||
        !attendance.timeIn ||
        attendance.timeOut
    ) {
        return;
    }


    const now =
        currentTime();


    if (
        now <
        settings.reminderTime
    ) {
        return;
    }


    reminderAlreadyShown =
        true;


    const message =
        'You are still timed in. Remember to record your Time Out.';


    toast(message);


    if (
        'Notification' in window &&
        Notification.permission ===
        'granted'
    ) {

        new Notification(
            'Over-Time Reminder',
            {
                body: message,
                icon:
                    'icons/icon-192.png'
            }
        );

    }

}


/* =====================================================
   BACKUP
===================================================== */

$('backupButton')
    .addEventListener(
        'click',
        () => {

            const backup = {

                format:
                    'overtime-backup-v3',

                savedAt:
                    new Date()
                        .toISOString(),

                studentName,

                goal,

                entries,

                attendances,

                settings,

                entryDraft
            };


            downloadBlob(

                new Blob(
                    [
                        JSON.stringify(
                            backup,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            'application/json'
                    }
                ),

                `OverTime_Backup_${localDate()}.json`
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


            event.target.value = '';


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
                    )
                ) {

                    throw Error(
                        'Invalid backup.'
                    );

                }


                if (
                    !confirm(
                        'Replace your current data with this backup?'
                    )
                ) {
                    return;
                }


                entries =
                    backup.entries || [];


                attendances =
                    backup.attendances || [];


                studentName =
                    backup.studentName || '';


                goal =
                    Number(
                        backup.goal
                    ) || 468;


                settings = {

                    ...settings,

                    ...(backup.settings || {})
                };


                entryDraft =
                    backup.entryDraft || null;


                await saveData();


                updateStudentInfo();

                updateSettingsForm();

                applyDarkMode();

                render();


                toast(
                    'Backup imported.'
                );

            } catch (error) {

                console.error(error);

                toast(
                    'Invalid backup file.'
                );

            }

        }
    );


/* =====================================================
   ONLINE / OFFLINE
===================================================== */

function updateConnectionStatus() {

    const online =
        navigator.onLine;


    $('connectionStatus')
        .classList
        .toggle(
            'offline',
            !online
        );


    $('connectionStatus')
        .lastChild.textContent =
        online
            ? ' Online'
            : ' Offline';

}



window.addEventListener(
    'online',
    () => {

        updateConnectionStatus();

        toast(
            'Back online.'
        );

    }
);


window.addEventListener(
    'offline',
    () => {

        updateConnectionStatus();

        toast(
            'You are offline. Local tracking still works.'
        );

    }
);


/* =====================================================
   PWA
===================================================== */

function registerPWA() {

    if (
        'serviceWorker' in navigator
    ) {

        navigator.serviceWorker
            .register(
                './service-worker.js'
            )
            .catch(
                console.error
            );

    }

}



window.addEventListener(
    'beforeinstallprompt',
    event => {

        event.preventDefault();


        deferredInstallPrompt =
            event;


        $('installAppButton').hidden =
            false;


        $('settingsInstallButton').hidden =
            false;

    }
);



async function installPWA() {

    if (!deferredInstallPrompt) {

        toast(
            'The app is already installed or installation is not currently available.'
        );

        return;

    }


    deferredInstallPrompt.prompt();


    await deferredInstallPrompt
        .userChoice;


    deferredInstallPrompt =
        null;


    $('installAppButton').hidden =
        true;


    $('settingsInstallButton').hidden =
        true;

}



$('installAppButton')
    .addEventListener(
        'click',
        installPWA
    );


$('settingsInstallButton')
    .addEventListener(
        'click',
        installPWA
    );


/* =====================================================
   GLOBAL CLICK EVENTS
===================================================== */

document.addEventListener(
    'click',
    event => {

        const button =
            event.target
                .closest('button');


        if (!button) {
            return;
        }


        if (button.dataset.page) {

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


        if (button.dataset.detail) {

            openDetail(
                button.dataset.detail
            );

        }


        if (button.dataset.edit) {

            $('detailDialog')
                .close();


            openForm(
                button.dataset.edit
            );

        }


        if (button.dataset.delete) {

            deleteEntry(
                button.dataset.delete
            );

        }


        if (
            button.dataset.pageNumber
        ) {

            entriesCurrentPage =
                Number(
                    button.dataset
                        .pageNumber
                );


            renderEntries();

        }


        if (
            button.dataset.calendarDate
        ) {

            openCalendarDay(
                button.dataset
                    .calendarDate
            );

        }


        if (
            button.dataset.editAttendance
        ) {

            openAttendanceEdit(
                button.dataset
                    .editAttendance
            );

        }

    }
);


/* =====================================================
   TOP DATE
===================================================== */

$('today')
    .textContent =
    new Date()
        .toLocaleDateString(
            'en-PH',
            {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            }
        );

$('overviewName').textContent =
    studentName
        ? studentName.split(' ')[0]
        : 'Student';

/* =====================================================
   START
===================================================== */

initialize();
