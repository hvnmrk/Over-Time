// 
// SUPABASE CONFIG
// 

const SUPABASE_URL =
    'https://gpswmjqsrrsnoxpjzbcj.supabase.co';

const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3dtanFzcnJzbm94cGp6YmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzg5MTYsImV4cCI6MjEwNjMxNDkxNn0.HZBarYW20s4Thk5mP3CS6NvdNhrgS1nrb0_S_YXVYbU';


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );



// 
// GLOBAL STATE
// 

let currentUser = null;

let entries = [];
let attendances = [];

let studentName = '';
let goal = 468;

let editingId = null;

let selectedEvidenceFile = null;
let selectedEvidencePreviewURL = null;

let existingEvidencePath = null;
let existingEvidenceUrl = null;

let calendarDate = new Date();

let entriesCurrentPage = 1;
let entriesPageSize = 10;

let deferredInstallPrompt = null;

let toastTimer = null;

let reminderAlreadyShown = false;

let appOpening = false;


let settings = {

    darkMode: false,

    autoBreakEnabled: true,

    autoBreakThreshold: 9,

    autoBreakMinutes: 60,

    reminderEnabled: false,

    reminderTime: '17:00'

};



// 
// BASIC HELPERS
// 

const $ = id =>
    document.getElementById(id);



function localDate(
    date = new Date()
) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            date.getDate()
        ).padStart(2, '0');


    return `${year}-${month}-${day}`;
}



function currentTime() {

    const now =
        new Date();


    const hour =
        String(
            now.getHours()
        ).padStart(2, '0');


    const minute =
        String(
            now.getMinutes()
        ).padStart(2, '0');


    return `${hour}:${minute}`;
}



function formatDate(value) {

    if (!value) {
        return '—';
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    return date.toLocaleDateString(
        undefined,
        {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    );
}



function formatShortDate(value) {

    if (!value) {
        return '—';
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    return date.toLocaleDateString(
        undefined,
        {
            month: 'short',
            day: 'numeric'
        }
    );
}



function formatTime(value) {

    if (!value) {
        return '—';
    }


    const parts =
        value.split(':');


    const hour =
        Number(parts[0]);

    const minute =
        Number(parts[1]);


    const date =
        new Date();


    date.setHours(
        hour,
        minute,
        0,
        0
    );


    return date.toLocaleTimeString(
        [],
        {
            hour: 'numeric',
            minute: '2-digit'
        }
    );
}



function escapeHTML(
    value = ''
) {

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}



function toast(message) {

    const element =
        $('toast');


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.classList.add(
        'show'
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                element.classList.remove(
                    'show'
                );

            },
            2600
        );
}



function createIcons() {

    if (
        window.lucide
    ) {

        lucide.createIcons();

    }
}



// 
// LOGIN / SIGNUP VIEW
// 

function showLogin() {

    if ($('loginView')) {
        $('loginView').hidden = false;
    }


    if ($('signupView')) {
        $('signupView').hidden = true;
    }


    if ($('loginError')) {
        $('loginError').textContent = '';
    }


    if ($('signupError')) {
        $('signupError').textContent = '';
    }
}



function showSignup() {

    if ($('loginView')) {
        $('loginView').hidden = true;
    }


    if ($('signupView')) {
        $('signupView').hidden = false;
    }


    if ($('loginError')) {
        $('loginError').textContent = '';
    }


    if ($('signupError')) {
        $('signupError').textContent = '';
    }
}



$('showSignup')
    ?.addEventListener(
        'click',
        showSignup
    );



$('showLogin')
    ?.addEventListener(
        'click',
        showLogin
    );



// 
// SIGN UP
// 

async function signUpUser() {

    const name =
        $('signupName')
            .value
            .trim();


    const email =
        $('signupEmail')
            .value
            .trim();


    const password =
        $('signupPassword')
            .value;


    const confirmation =
        $('signupConfirmPassword')
            .value;


    $('signupError').textContent =
        '';


    if (!name) {

        $('signupError').textContent =
            'Enter your name.';

        return;
    }


    if (!email) {

        $('signupError').textContent =
            'Enter your email.';

        return;
    }


    if (
        password.length <
        6
    ) {

        $('signupError').textContent =
            'Password must be at least 6 characters.';

        return;
    }


    if (
        password !==
        confirmation
    ) {

        $('signupError').textContent =
            'Passwords do not match.';

        return;
    }


    $('signupButton').disabled =
        true;


    $('signupButton').textContent =
        'Creating account...';


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signUp({

                    email,
                    password,

                    options: {

                        emailRedirectTo:
                            window.location.origin,

                        data: {

                            full_name:
                                name

                        }

                    }

                });


        if (error) {
            throw error;
        }


        if (
            data.user &&
            data.session
        ) {

            await createProfile(
                data.user,
                name
            );


            await openApp(
                data.user
            );


            return;
        }


        $('signupError').textContent =
            'Account created. Check your email and confirm your account before signing in.';

    } catch (error) {

        console.error(
            'Signup error:',
            error
        );


        $('signupError').textContent =
            error.message ||
            'Unable to create account.';

    } finally {

        $('signupButton').disabled =
            false;


        $('signupButton').textContent =
            'Create Account';

    }
}



$('signupButton')
    ?.addEventListener(
        'click',
        signUpUser
    );



// 
// LOGIN
// FIXED VERSION
// 

async function loginUser() {

    if (
        appOpening
    ) {
        return;
    }


    const email =
        $('loginEmail')
            .value
            .trim();


    const password =
        $('loginPassword')
            .value;


    $('loginError').textContent =
        '';


    if (
        !email ||
        !password
    ) {

        $('loginError').textContent =
            'Enter your email and password.';

        return;
    }


    const button =
        $('loginButton');


    button.disabled =
        true;


    button.textContent =
        'Signing in...';


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword({

                    email,
                    password

                });


        if (error) {
            throw error;
        }


        if (
            !data.user
        ) {

            throw new Error(
                'Unable to load your account.'
            );

        }


        await openApp(
            data.user
        );

    } catch (error) {

        console.error(
            'Login error:',
            error
        );


        $('loginError').textContent =
            error.message ||
            'Unable to sign in.';

    } finally {

        button.disabled =
            false;


        button.textContent =
            'Sign In';

    }
}



$('loginButton')
    ?.addEventListener(
        'click',
        loginUser
    );



$('loginPassword')
    ?.addEventListener(
        'keydown',
        event => {

            if (
                event.key ===
                'Enter'
            ) {

                loginUser();

            }

        }
    );



// 
// LOG OUT
// 

$('logoutButton')
    ?.addEventListener(
        'click',
        async () => {

            const okay =
                confirm(
                    'Sign out of Over-Time?'
                );


            if (!okay) {
                return;
            }


            try {

                await supabaseClient.auth
                    .signOut();

            } catch (error) {

                console.error(
                    error
                );

            }


            currentUser =
                null;


            entries =
                [];


            attendances =
                [];


            if ($('mainApp')) {
                $('mainApp').hidden = true;
            }


            if ($('authScreen')) {
                $('authScreen').hidden = false;
            }


            showLogin();

        }
    );



// 
// CHECK AUTH
// 

async function checkAuth() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .getSession();


        if (error) {
            throw error;
        }


        const session =
            data.session;


        if (
            session?.user
        ) {

            await openApp(
                session.user
            );


            return;
        }


        $('authScreen').hidden =
            false;


        $('mainApp').hidden =
            true;

    } catch (error) {

        console.error(
            'Auth check:',
            error
        );


        $('authScreen').hidden =
            false;


        $('mainApp').hidden =
            true;

    }
}



// 
// OPEN APP
// FIXED TO PREVENT DOUBLE OPENING
// 

async function openApp(user) {

    if (
        appOpening
    ) {
        return;
    }


    appOpening =
        true;


    try {

        currentUser =
            user;


        $('profileEmail').textContent =
            user.email ||
            '';


        $('settingsEmail').textContent =
            user.email ||
            '';


        /*
         * Load sequentially instead of causing
         * multiple auth/database calls to fight.
         */

        await loadProfile();

        await loadAttendance();

        await loadEntries();


        $('authScreen').hidden =
            true;


        $('mainApp').hidden =
            false;


        render();


        createIcons();

    } catch (error) {

        console.error(
            'App startup error:',
            error
        );


        currentUser =
            null;


        $('mainApp').hidden =
            true;


        $('authScreen').hidden =
            false;


        if ($('loginError')) {

            $('loginError').textContent =
                'Signed in, but the app could not load. Check the browser console.';

        }

    } finally {

        appOpening =
            false;

    }
}



// 
// PROFILE
// 

async function createProfile(
    user,
    name
) {

    const {
        error
    } =
        await supabaseClient
            .from('profiles')
            .upsert({

                id:
                    user.id,

                student_name:
                    name,

                required_hours:
                    468,

                dark_mode:
                    false,

                auto_break_enabled:
                    true,

                auto_break_threshold:
                    9,

                auto_break_minutes:
                    60,

                reminder_enabled:
                    false,

                reminder_time:
                    '17:00'

            });


    if (error) {

        console.error(
            'Profile creation:',
            error
        );

    }
}



async function loadProfile() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from('profiles')
            .select('*')
            .eq(
                'id',
                currentUser.id
            )
            .maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {

        const fallbackName =
            currentUser
                .user_metadata
                ?.full_name ||
            'Student';


        await createProfile(
            currentUser,
            fallbackName
        );


        studentName =
            fallbackName;


        goal =
            468;


        settings = {

            darkMode: false,

            autoBreakEnabled: true,

            autoBreakThreshold: 9,

            autoBreakMinutes: 60,

            reminderEnabled: false,

            reminderTime: '17:00'

        };


        applyDarkMode();


        return;
    }


    studentName =
        data.student_name ||
        'Student';


    goal =
        Number(
            data.required_hours
        ) ||
        468;


    settings.darkMode =
        Boolean(
            data.dark_mode
        );


    settings.autoBreakEnabled =
        data.auto_break_enabled ??
        true;


    settings.autoBreakThreshold =
        Number(
            data.auto_break_threshold
        ) ||
        9;


    settings.autoBreakMinutes =
        data.auto_break_minutes === null ||
            data.auto_break_minutes === undefined
            ?
            60
            :
            Number(
                data.auto_break_minutes
            );


    settings.reminderEnabled =
        Boolean(
            data.reminder_enabled
        );


    settings.reminderTime =
        data.reminder_time
            ?
            String(
                data.reminder_time
            ).slice(
                0,
                5
            )
            :
            '17:00';


    applyDarkMode();
}



async function saveProfile() {

    const {
        error
    } =
        await supabaseClient
            .from('profiles')
            .upsert({

                id:
                    currentUser.id,

                student_name:
                    studentName,

                required_hours:
                    goal,

                dark_mode:
                    settings.darkMode,

                auto_break_enabled:
                    settings.autoBreakEnabled,

                auto_break_threshold:
                    settings.autoBreakThreshold,

                auto_break_minutes:
                    settings.autoBreakMinutes,

                reminder_enabled:
                    settings.reminderEnabled,

                reminder_time:
                    settings.reminderTime,

                updated_at:
                    new Date()
                        .toISOString()

            });


    if (error) {
        throw error;
    }
}



// 
// SETTINGS
// 

function updateSettingsInputs() {

    if ($('studentName')) {

        $('studentName').value =
            studentName;

    }


    if ($('hoursGoal')) {

        $('hoursGoal').value =
            goal;

    }


    if ($('autoBreakEnabled')) {

        $('autoBreakEnabled').checked =
            settings.autoBreakEnabled;

    }


    if ($('autoBreakThreshold')) {

        $('autoBreakThreshold').value =
            settings.autoBreakThreshold;

    }


    if ($('autoBreakMinutes')) {

        $('autoBreakMinutes').value =
            settings.autoBreakMinutes;

    }


    if ($('reminderEnabled')) {

        $('reminderEnabled').checked =
            settings.reminderEnabled;

    }


    if ($('reminderTime')) {

        $('reminderTime').value =
            settings.reminderTime;

    }


    if ($('darkModeToggle')) {

        $('darkModeToggle').checked =
            settings.darkMode;

    }
}



$('settingsForm')
    ?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            const name =
                $('studentName')
                    .value
                    .trim();


            const hours =
                Number(
                    $('hoursGoal')
                        .value
                );


            if (
                !name ||
                hours <= 0
            ) {

                toast(
                    'Enter valid settings.'
                );

                return;
            }


            studentName =
                name;


            goal =
                hours;


            settings.autoBreakEnabled =
                $('autoBreakEnabled')
                    .checked;


            settings.autoBreakThreshold =
                Number(
                    $('autoBreakThreshold')
                        .value
                ) ||
                9;


            settings.autoBreakMinutes =
                Number(
                    $('autoBreakMinutes')
                        .value
                ) ||
                0;


            settings.reminderEnabled =
                $('reminderEnabled')
                    .checked;


            settings.reminderTime =
                $('reminderTime')
                    .value ||
                '17:00';


            settings.darkMode =
                $('darkModeToggle')
                    .checked;


            try {

                await saveProfile();


                applyDarkMode();


                updateStudentInfo();


                renderDashboard();


                renderWeeklyReport();


                renderMonthlyReport();


                toast(
                    'Settings saved.'
                );

            } catch (error) {

                console.error(
                    error
                );


                toast(
                    'Unable to save settings.'
                );

            }

        }
    );



$('darkModeToggle')
    ?.addEventListener(
        'change',
        () => {

            settings.darkMode =
                $('darkModeToggle')
                    .checked;


            applyDarkMode();

        }
    );



function applyDarkMode() {

    document.body
        .classList
        .toggle(
            'dark',
            settings.darkMode
        );
}



// 
// STUDENT INFORMATION
// 

function updateStudentInfo() {

    const name =
        studentName ||
        'Student';


    if ($('profileName')) {

        $('profileName').textContent =
            name;

    }


    if ($('overviewName')) {

        $('overviewName').textContent =
            name
                .split(/\s+/)
                .filter(Boolean)[0] ||
            'Student';

    }


    if ($('profileAvatar')) {

        $('profileAvatar').textContent =
            name
                .split(/\s+/)
                .filter(Boolean)
                .map(
                    item =>
                        item[0]
                )
                .slice(
                    0,
                    2
                )
                .join('')
                .toUpperCase();

    }


    if ($('weeklyStudentName')) {

        $('weeklyStudentName').textContent =
            name;

    }


    if ($('monthlyStudentName')) {

        $('monthlyStudentName').textContent =
            name;

    }


    updateSettingsInputs();
}



// 
// NAVIGATION
// 

const pageNames = {

    overview:
        'Dashboard',

    calendar:
        'Calendar',

    attendance:
        'Attendance',

    entries:
        'Daily Logs',

    reports:
        'Reports',

    settings:
        'Settings'

};



function closeMenu() {

    $('sidebar')
        ?.classList
        .remove(
            'open'
        );


    if ($('backdrop')) {

        $('backdrop').hidden =
            true;

    }
}



function switchPage(pageId) {

    document
        .querySelectorAll(
            '.page'
        )
        .forEach(
            page => {

                page.classList.remove(
                    'active'
                );

            }
        );


    document
        .querySelectorAll(
            '.nav-link'
        )
        .forEach(
            button => {

                button.classList.remove(
                    'active'
                );

            }
        );


    $(pageId)
        ?.classList
        .add(
            'active'
        );


    document
        .querySelector(
            `.nav-link[data-page="${pageId}"]`
        )
        ?.classList
        .add(
            'active'
        );


    if ($('pageTitle')) {

        $('pageTitle').textContent =
            pageNames[pageId] ||
            'Dashboard';

    }


    closeMenu();


    if (
        pageId ===
        'calendar'
    ) {

        renderCalendar();

    }


    if (
        pageId ===
        'attendance'
    ) {

        renderAttendanceHistory();

    }


    if (
        pageId ===
        'entries'
    ) {

        renderEntries();

    }


    if (
        pageId ===
        'reports'
    ) {

        renderWeeklyReport();

        renderMonthlyReport();

    }


    createIcons();
}



document
    .querySelectorAll(
        '[data-page]'
    )
    .forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    switchPage(
                        button.dataset.page
                    );

                }
            );

        }
    );



// 
// MOBILE SIDEBAR
// 

$('menuButton')
    ?.addEventListener(
        'click',
        () => {

            const open =
                $('sidebar')
                    .classList
                    .toggle(
                        'open'
                    );


            if ($('backdrop')) {

                $('backdrop').hidden =
                    !open;

            }

        }
    );



$('backdrop')
    ?.addEventListener(
        'click',
        closeMenu
    );



// 
// ATTENDANCE
// 

async function loadAttendance() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('attendance')
            .select('*')
            .order(
                'attendance_date',
                {
                    ascending:
                        false
                }
            );


    if (error) {
        throw error;
    }


    attendances =
        (data || [])
            .map(
                item => ({

                    id:
                        item.id,

                    date:
                        item.attendance_date,

                    timeIn:
                        item.time_in,

                    timeOut:
                        item.time_out

                })
            );
}



async function saveAttendance(
    record
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('attendance')
            .upsert(
                {

                    user_id:
                        currentUser.id,

                    attendance_date:
                        record.date,

                    time_in:
                        record.timeIn ||
                        null,

                    time_out:
                        record.timeOut ||
                        null,

                    updated_at:
                        new Date()
                            .toISOString()

                },
                {

                    onConflict:
                        'user_id,attendance_date'

                }
            )
            .select()
            .single();


    if (error) {
        throw error;
    }


    return {

        id:
            data.id,

        date:
            data.attendance_date,

        timeIn:
            data.time_in,

        timeOut:
            data.time_out

    };
}



// 
// TIME IN
// ONE ATTENDANCE RECORD PER ACTUAL DAY
// 

$('quickTimeIn')
    ?.addEventListener(
        'click',
        async () => {

            const today =
                localDate();


            const existing =
                attendances.find(
                    item =>
                        item.date ===
                        today
                );


            if (existing) {

                toast(
                    'You already have an attendance record for today.'
                );

                return;
            }


            try {

                const saved =
                    await saveAttendance({

                        date:
                            today,

                        timeIn:
                            currentTime(),

                        timeOut:
                            null

                    });


                attendances.push(
                    saved
                );


                render();


                toast(
                    `Timed in at ${formatTime(saved.timeIn)}.`
                );

            } catch (error) {

                console.error(
                    error
                );


                toast(
                    'Unable to save Time In.'
                );

            }

        }
    );



// 
// TIME OUT
// 

$('quickTimeOut')
    ?.addEventListener(
        'click',
        async () => {

            const today =
                localDate();


            const record =
                attendances.find(
                    item =>
                        item.date ===
                        today
                );


            if (
                !record?.timeIn
            ) {

                toast(
                    'Time In first.'
                );

                return;
            }


            if (
                record.timeOut
            ) {

                toast(
                    'You already timed out today.'
                );

                return;
            }


            const now =
                currentTime();


            const okay =
                confirm(
                    `Time out at ${formatTime(now)}?`
                );


            if (!okay) {
                return;
            }


            try {

                const saved =
                    await saveAttendance({

                        ...record,

                        timeOut:
                            now

                    });


                Object.assign(
                    record,
                    saved
                );


                render();


                toast(
                    `Timed out at ${formatTime(saved.timeOut)}.`
                );


                openEntryForm(
                    null,
                    saved
                );

            } catch (error) {

                console.error(
                    error
                );


                toast(
                    'Unable to save Time Out.'
                );

            }

        }
    );



// 
// TODAY ATTENDANCE UI
// 

function renderTodayAttendance() {

    const today =
        localDate();


    const record =
        attendances.find(
            item =>
                item.date ===
                today
        );


    if ($('attendanceDate')) {

        $('attendanceDate').textContent =
            formatDate(
                today
            );

    }


    if ($('attendanceWarning')) {

        $('attendanceWarning').hidden =
            true;

    }


    if (!record) {

        $('attendanceStatus').textContent =
            "You haven't timed in yet.";


        $('attendanceTimes').innerHTML =
            '';


        $('quickTimeIn').disabled =
            false;


        $('quickTimeOut').disabled =
            true;


        return;
    }


    $('attendanceTimes').innerHTML =
        `
        <span>
            Time In:
            <strong>
                ${formatTime(record.timeIn)}
            </strong>
        </span>

        <span>
            Time Out:
            <strong>
                ${formatTime(record.timeOut)}
            </strong>
        </span>
        `;


    if (
        record.timeIn &&
        !record.timeOut
    ) {

        $('attendanceStatus').textContent =
            'Currently timed in.';


        $('quickTimeIn').disabled =
            true;


        $('quickTimeOut').disabled =
            false;


        if ($('attendanceWarning')) {

            $('attendanceWarning').hidden =
                false;

        }


        if ($('attendanceWarningText')) {

            $('attendanceWarningText').textContent =
                'You are currently timed in. Remember to Time Out before leaving.';

        }

    } else {

        $('attendanceStatus').textContent =
            'Attendance completed.';


        $('quickTimeIn').disabled =
            true;


        $('quickTimeOut').disabled =
            true;

    }
}



// 
// ATTENDANCE HISTORY
// 

function renderAttendanceHistory() {

    if (
        !$('attendanceHistory')
    ) {
        return;
    }


    const month =
        $('attendanceMonthFilter')
            ?.value ||
        '';


    let list =
        [...attendances];


    if (month) {

        list =
            list.filter(
                record =>
                    record.date.startsWith(
                        month
                    )
            );

    }


    list.sort(
        (a, b) =>
            b.date.localeCompare(
                a.date
            )
    );


    if (
        !list.length
    ) {

        $('attendanceHistory').innerHTML =
            `
            <div class="empty">
                No attendance records.
            </div>
            `;

        return;
    }


    $('attendanceHistory').innerHTML =
        list
            .map(
                record => `
                    <article
                        class="
                            attendance-record
                            ${!record.timeOut ? 'incomplete' : ''}
                        "
                    >

                        <div>

                            <strong>
                                ${formatDate(record.date)}
                            </strong>

                            <small>
                                ${record.timeOut
                        ?
                        'Completed'
                        :
                        'Incomplete'
                    }
                            </small>

                        </div>


                        <div class="attendance-time-value">

                            <span>
                                TIME IN
                            </span>

                            ${formatTime(record.timeIn)}

                        </div>


                        <div class="attendance-time-value">

                            <span>
                                TIME OUT
                            </span>

                            ${formatTime(record.timeOut)}

                        </div>

                    </article>
                `
            )
            .join('');
}



$('attendanceMonthFilter')
    ?.addEventListener(
        'change',
        renderAttendanceHistory
    );



$('clearAttendanceMonth')
    ?.addEventListener(
        'click',
        () => {

            $('attendanceMonthFilter').value =
                '';


            renderAttendanceHistory();

        }
    );



// 
// HOURS
// 

function calculateRawShiftHours(
    start,
    end
) {

    if (
        !start ||
        !end
    ) {
        return 0;
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


    const startTotal =
        startHour * 60 +
        startMinute;


    const endTotal =
        endHour * 60 +
        endMinute;


    if (
        endTotal <=
        startTotal
    ) {
        return 0;
    }


    return (
        endTotal -
        startTotal
    ) / 60;
}



function calculateHours(
    start,
    end,
    breakMinutes
) {

    const raw =
        calculateRawShiftHours(
            start,
            end
        );


    if (
        raw <= 0
    ) {
        return 0;
    }


    const minutes =
        raw * 60 -
        Number(
            breakMinutes ||
            0
        );


    if (
        minutes <= 0
    ) {
        return 0;
    }


    return Number(
        (
            minutes /
            60
        ).toFixed(2)
    );
}



function applyAutoBreak() {

    if (
        !settings.autoBreakEnabled
    ) {

        if ($('autoBreakNote')) {

            $('autoBreakNote').textContent =
                '';

        }


        return;
    }


    const raw =
        calculateRawShiftHours(

            $('timeIn').value,

            $('timeOut').value

        );


    if (
        raw >=
        settings.autoBreakThreshold
    ) {

        $('breakMinutes').value =
            settings.autoBreakMinutes;


        $('autoBreakNote').textContent =
            `${settings.autoBreakMinutes} minute automatic break applied.`;

    } else {

        $('breakMinutes').value =
            0;


        $('autoBreakNote').textContent =
            '';

    }
}



function updateHoursPreview() {

    if (
        settings.autoBreakEnabled
    ) {

        applyAutoBreak();

    }


    const hours =
        calculateHours(

            $('timeIn').value,

            $('timeOut').value,

            $('breakMinutes').value

        );


    $('hoursPreview').textContent =
        `Rendered hours: ${hours.toFixed(2)} hrs`;
}



[
    'timeIn',
    'timeOut'
].forEach(
    id => {

        $(id)
            ?.addEventListener(
                'input',
                updateHoursPreview
            );

    }
);



$('breakMinutes')
    ?.addEventListener(
        'input',
        () => {

            const hours =
                calculateHours(

                    $('timeIn').value,

                    $('timeOut').value,

                    $('breakMinutes').value

                );


            $('hoursPreview').textContent =
                `Rendered hours: ${hours.toFixed(2)} hrs`;

        }
    );



$('timeInNow')
    ?.addEventListener(
        'click',
        () => {

            $('timeIn').value =
                currentTime();


            updateHoursPreview();

        }
    );



$('timeOutNow')
    ?.addEventListener(
        'click',
        () => {

            $('timeOut').value =
                currentTime();


            updateHoursPreview();

        }
    );



// 
// SUPABASE STORAGE
// 

async function uploadEvidence(
    file
) {

    if (
        !file ||
        !currentUser
    ) {
        return null;
    }


    const extension =
        file.name
            .split('.')
            .pop()
            .toLowerCase();


    const allowedExtensions =
        [
            'jpg',
            'jpeg',
            'png',
            'webp'
        ];


    const safeExtension =
        allowedExtensions
            .includes(
                extension
            )
            ?
            extension
            :
            'jpg';


    const filename =
        `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;


    const path =
        `${currentUser.id}/${filename}`;


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from('evidence')
            .upload(
                path,
                file,
                {
                    cacheControl:
                        '3600',

                    upsert:
                        false
                }
            );


    if (error) {
        throw error;
    }


    return data.path;
}



async function getEvidenceURL(
    path
) {

    if (!path) {
        return null;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from('evidence')
            .createSignedUrl(
                path,
                60 * 60
            );


    if (error) {

        console.error(
            'Evidence URL:',
            error
        );


        return null;
    }


    return data.signedUrl;
}



async function deleteEvidence(
    path
) {

    if (!path) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .storage
            .from('evidence')
            .remove([
                path
            ]);


    if (error) {

        console.error(
            'Evidence delete:',
            error
        );

    }
}



// 
// LOAD ENTRIES
// 

async function loadEntries() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('entries')
            .select('*')
            .order(
                'entry_date',
                {
                    ascending:
                        false
                }
            );


    if (error) {
        throw error;
    }


    const mapped =
        (data || [])
            .map(
                item => ({

                    id:
                        item.id,

                    date:
                        item.entry_date,

                    task:
                        item.task,

                    timeIn:
                        item.time_in,

                    timeOut:
                        item.time_out,

                    breakMinutes:
                        Number(
                            item.break_minutes
                        ) ||
                        0,

                    hours:
                        Number(
                            item.rendered_hours
                        ) ||
                        0,

                    description:
                        item.description ||
                        '',

                    evidencePath:
                        item.evidence_path ||
                        null,

                    evidenceUrl:
                        null

                })
            );


    await Promise.all(

        mapped.map(
            async entry => {

                if (
                    entry.evidencePath
                ) {

                    entry.evidenceUrl =
                        await getEvidenceURL(
                            entry.evidencePath
                        );

                }

            }
        )

    );


    entries =
        mapped;
}



// 
// EVIDENCE INPUT
// 

$('evidence')
    ?.addEventListener(
        'change',
        event => {

            const file =
                event.target
                    .files?.[0] ||
                null;


            selectedEvidenceFile =
                file;


            if (
                selectedEvidencePreviewURL
            ) {

                URL.revokeObjectURL(
                    selectedEvidencePreviewURL
                );


                selectedEvidencePreviewURL =
                    null;

            }


            if (!file) {

                $('attachmentNote').textContent =
                    existingEvidencePath
                        ?
                        'Current photo evidence attached.'
                        :
                        '';


                if (
                    existingEvidenceUrl
                ) {

                    $('evidencePreviewImage').src =
                        existingEvidenceUrl;


                    $('evidencePreview').hidden =
                        false;

                } else {

                    $('evidencePreview').hidden =
                        true;

                }


                return;
            }


            $('attachmentNote').textContent =
                `Selected: ${file.name}`;


            selectedEvidencePreviewURL =
                URL.createObjectURL(
                    file
                );


            $('evidencePreviewImage').src =
                selectedEvidencePreviewURL;


            $('evidencePreview').hidden =
                false;

        }
    );



// 
// ENTRY FORM
// 

function resetEntryForm() {

    editingId =
        null;


    selectedEvidenceFile =
        null;


    existingEvidencePath =
        null;


    existingEvidenceUrl =
        null;


    if (
        selectedEvidencePreviewURL
    ) {

        URL.revokeObjectURL(
            selectedEvidencePreviewURL
        );


        selectedEvidencePreviewURL =
            null;

    }


    $('entryForm').reset();


    $('entryDate').value =
        localDate();


    $('breakMinutes').value =
        settings.autoBreakMinutes;


    $('formTitle').textContent =
        'New Entry';


    $('formError').textContent =
        '';


    $('attachmentNote').textContent =
        '';


    $('evidencePreview').hidden =
        true;


    $('evidencePreviewImage').src =
        '';


    $('autoBreakNote').textContent =
        '';


    updateHoursPreview();
}



function openEntryForm(
    entry = null,
    attendance = null
) {

    resetEntryForm();


    if (entry) {

        editingId =
            entry.id;


        $('formTitle').textContent =
            'Edit Entry';


        $('entryDate').value =
            entry.date;


        $('task').value =
            entry.task;


        $('timeIn').value =
            entry.timeIn ||
            '';


        $('timeOut').value =
            entry.timeOut ||
            '';


        $('breakMinutes').value =
            entry.breakMinutes;


        $('description').value =
            entry.description;


        existingEvidencePath =
            entry.evidencePath;


        existingEvidenceUrl =
            entry.evidenceUrl;


        if (
            entry.evidenceUrl
        ) {

            $('evidencePreviewImage').src =
                entry.evidenceUrl;


            $('evidencePreview').hidden =
                false;


            $('attachmentNote').textContent =
                'Current photo evidence attached.';

        }

    }


    if (attendance) {

        $('entryDate').value =
            attendance.date;


        $('timeIn').value =
            attendance.timeIn ||
            '';


        $('timeOut').value =
            attendance.timeOut ||
            '';

    }


    updateHoursPreview();


    $('entryDialog')
        .showModal();
}



document
    .querySelectorAll(
        '[data-new]'
    )
    .forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    openEntryForm();

                }
            );

        }
    );



$('closeForm')
    ?.addEventListener(
        'click',
        () => {

            $('entryDialog')
                .close();

        }
    );



$('cancelForm')
    ?.addEventListener(
        'click',
        () => {

            $('entryDialog')
                .close();

        }
    );



// 
// CLOUD DUPLICATE DATE CHECK
// 

async function checkDuplicateLogDate(
    selectedDate,
    currentEntryId = null
) {

    let query =
        supabaseClient
            .from('entries')
            .select('id')
            .eq(
                'user_id',
                currentUser.id
            )
            .eq(
                'entry_date',
                selectedDate
            );


    if (
        currentEntryId
    ) {

        query =
            query.neq(
                'id',
                currentEntryId
            );

    }


    const {
        data,
        error
    } =
        await query.limit(1);


    if (error) {
        throw error;
    }


    return (
        data &&
        data.length >
        0
    );
}



// 
// SAVE DAILY ENTRY
//
// RULE:
// 1 LOG MAXIMUM FOR EACH SELECTED DATE
//
// Sep 30 = allowed
// Sep 29 = allowed
// Sep 28 = allowed
//
// Another Sep 30 = BLOCKED
// 

$('entryForm')
    ?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            $('formError').textContent =
                '';


            const entry = {

                date:
                    $('entryDate').value,

                task:
                    $('task')
                        .value
                        .trim(),

                timeIn:
                    $('timeIn').value,

                timeOut:
                    $('timeOut').value,

                breakMinutes:
                    Number(
                        $('breakMinutes')
                            .value
                    ) ||
                    0,

                description:
                    $('description')
                        .value
                        .trim()

            };


            entry.hours =
                calculateHours(

                    entry.timeIn,

                    entry.timeOut,

                    entry.breakMinutes

                );


            if (
                !entry.date ||
                !entry.task ||
                !entry.timeIn ||
                !entry.timeOut ||
                !entry.description
            ) {

                $('formError').textContent =
                    'Complete all required fields.';

                return;
            }


            if (
                entry.hours <=
                0
            ) {

                $('formError').textContent =
                    'Time Out must be later than Time In.';

                return;
            }


            /*
             * FIRST CHECK:
             * Current loaded data
             */

            const localDuplicate =
                entries.some(
                    item =>
                        item.date ===
                        entry.date &&
                        item.id !==
                        editingId
                );


            if (
                localDuplicate
            ) {

                $('formError').textContent =
                    'A daily log already exists for this date. Edit the existing log or choose another date.';

                return;
            }


            $('saveButton').disabled =
                true;


            $('saveButton').textContent =
                'Checking date...';


            let newEvidencePath =
                existingEvidencePath;


            let uploadedNewEvidence =
                false;


            try {

                /*
                 * SECOND CHECK:
                 * Supabase itself
                 *
                 * This prevents stale data from another
                 * browser/device creating duplicates.
                 */

                const cloudDuplicate =
                    await checkDuplicateLogDate(

                        entry.date,

                        editingId

                    );


                if (
                    cloudDuplicate
                ) {

                    $('formError').textContent =
                        'A daily log already exists for this date. Edit the existing log or choose another date.';

                    return;
                }


                $('saveButton').textContent =
                    'Saving...';


                if (
                    selectedEvidenceFile
                ) {

                    newEvidencePath =
                        await uploadEvidence(
                            selectedEvidenceFile
                        );


                    uploadedNewEvidence =
                        true;

                }


                if (
                    editingId
                ) {

                    const {
                        error
                    } =
                        await supabaseClient
                            .from('entries')
                            .update({

                                entry_date:
                                    entry.date,

                                task:
                                    entry.task,

                                time_in:
                                    entry.timeIn,

                                time_out:
                                    entry.timeOut,

                                break_minutes:
                                    entry.breakMinutes,

                                rendered_hours:
                                    entry.hours,

                                description:
                                    entry.description,

                                evidence_path:
                                    newEvidencePath,

                                updated_at:
                                    new Date()
                                        .toISOString()

                            })
                            .eq(
                                'id',
                                editingId
                            )
                            .eq(
                                'user_id',
                                currentUser.id
                            );


                    if (error) {

                        if (
                            error.code ===
                            '23505'
                        ) {

                            throw new Error(
                                'A daily log already exists for this date.'
                            );

                        }


                        throw error;

                    }


                    if (
                        uploadedNewEvidence &&
                        existingEvidencePath &&
                        existingEvidencePath !==
                        newEvidencePath
                    ) {

                        await deleteEvidence(
                            existingEvidencePath
                        );

                    }

                } else {

                    const {
                        error
                    } =
                        await supabaseClient
                            .from('entries')
                            .insert({

                                user_id:
                                    currentUser.id,

                                entry_date:
                                    entry.date,

                                task:
                                    entry.task,

                                time_in:
                                    entry.timeIn,

                                time_out:
                                    entry.timeOut,

                                break_minutes:
                                    entry.breakMinutes,

                                rendered_hours:
                                    entry.hours,

                                description:
                                    entry.description,

                                evidence_path:
                                    newEvidencePath

                            });


                    if (error) {

                        if (
                            error.code ===
                            '23505'
                        ) {

                            throw new Error(
                                'A daily log already exists for this date.'
                            );

                        }


                        throw error;

                    }

                }


                await loadEntries();


                $('entryDialog')
                    .close();


                render();


                toast(
                    editingId
                        ?
                        'Entry updated.'
                        :
                        'Entry saved.'
                );


                editingId =
                    null;


                selectedEvidenceFile =
                    null;


                existingEvidencePath =
                    null;


                existingEvidenceUrl =
                    null;

            } catch (error) {

                console.error(
                    'Entry save:',
                    error
                );


                /*
                 * If upload succeeded but DB failed,
                 * clean up the unused new photo.
                 */

                if (
                    uploadedNewEvidence &&
                    newEvidencePath !==
                    existingEvidencePath
                ) {

                    await deleteEvidence(
                        newEvidencePath
                    );

                }


                $('formError').textContent =
                    error.message ||
                    'Unable to save entry.';

            } finally {

                $('saveButton').disabled =
                    false;


                $('saveButton').textContent =
                    'Save Entry';

            }

        }
    );



// 
// DELETE ENTRY
// 

async function deleteEntry(id) {

    const entry =
        entries.find(
            item =>
                item.id ===
                id
        );


    if (!entry) {
        return;
    }


    const okay =
        confirm(
            'Delete this daily log? Attendance will remain.'
        );


    if (!okay) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from('entries')
                .delete()
                .eq(
                    'id',
                    id
                )
                .eq(
                    'user_id',
                    currentUser.id
                );


        if (error) {
            throw error;
        }


        if (
            entry.evidencePath
        ) {

            await deleteEvidence(
                entry.evidencePath
            );

        }


        entries =
            entries.filter(
                item =>
                    item.id !==
                    id
            );


        render();


        toast(
            'Daily log deleted.'
        );

    } catch (error) {

        console.error(
            error
        );


        toast(
            'Unable to delete log.'
        );

    }
}



// 
// VIEW ENTRY
// 

function openEntryDetail(id) {

    const entry =
        entries.find(
            item =>
                item.id ===
                id
        );


    if (!entry) {
        return;
    }


    $('detailTitle').textContent =
        entry.task;


    $('detailContent').innerHTML =
        `
        <p>
            <strong>Date:</strong>
            ${formatDate(entry.date)}
        </p>

        <p>
            <strong>Time:</strong>
            ${formatTime(entry.timeIn)}
            –
            ${formatTime(entry.timeOut)}
        </p>

        <p>
            <strong>Break:</strong>
            ${entry.breakMinutes} minutes
        </p>

        <p>
            <strong>Rendered:</strong>
            ${entry.hours.toFixed(2)} hours
        </p>

        <hr>

        <p>
            ${escapeHTML(entry.description)}
        </p>

        ${entry.evidenceUrl
            ?
            `
                <img
                    class="detail-photo"
                    src="${entry.evidenceUrl}"
                    alt="Photo evidence"
                >
                `
            :
            `
                <p class="muted">
                    No photo evidence.
                </p>
                `
        }
        `;


    $('detailDialog')
        .showModal();
}



$('closeDetails')
    ?.addEventListener(
        'click',
        () => {

            $('detailDialog')
                .close();

        }
    );



// 
// FILTER DAILY LOGS
// 

function getFilteredEntries() {

    const search =
        $('search')
            ?.value
            .trim()
            .toLowerCase() ||
        '';


    const from =
        $('filterDateFrom')
            ?.value ||
        '';


    const to =
        $('filterDateTo')
            ?.value ||
        '';


    const sort =
        $('entrySort')
            ?.value ||
        'newest';


    let list =
        entries.filter(
            entry => {

                const text =
                    `${entry.task} ${entry.description}`
                        .toLowerCase();


                if (
                    search &&
                    !text.includes(
                        search
                    )
                ) {
                    return false;
                }


                if (
                    from &&
                    entry.date <
                    from
                ) {
                    return false;
                }


                if (
                    to &&
                    entry.date >
                    to
                ) {
                    return false;
                }


                return true;

            }
        );


    list =
        [...list];


    if (
        sort ===
        'oldest'
    ) {

        list.sort(
            (a, b) =>
                a.date.localeCompare(
                    b.date
                )
        );

    } else if (
        sort ===
        'hours-high'
    ) {

        list.sort(
            (a, b) =>
                b.hours -
                a.hours
        );

    } else if (
        sort ===
        'hours-low'
    ) {

        list.sort(
            (a, b) =>
                a.hours -
                b.hours
        );

    } else {

        list.sort(
            (a, b) =>
                b.date.localeCompare(
                    a.date
                )
        );

    }


    return list;
}



// 
// RENDER DAILY LOGS
// 

function renderEntries() {

    if (
        !$('entriesList')
    ) {
        return;
    }


    const list =
        getFilteredEntries();


    entriesPageSize =
        Number(
            $('entriesPerPage')
                ?.value
        ) ||
        10;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                list.length /
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


    const start =
        (
            entriesCurrentPage -
            1
        ) *
        entriesPageSize;


    const pageEntries =
        list.slice(
            start,
            start +
            entriesPageSize
        );


    if ($('entriesResultCount')) {

        $('entriesResultCount').textContent =
            `${list.length} ${list.length === 1
                ?
                'entry'
                :
                'entries'
            }`;

    }


    if (
        !pageEntries.length
    ) {

        $('entriesList').innerHTML =
            `
            <div class="empty">
                No entries found.
            </div>
            `;

    } else {

        $('entriesList').innerHTML =
            pageEntries
                .map(
                    entry => `
                        <article class="entry-card">

                            <div class="entry-top">

                                <div>

                                    <h3>
                                        ${escapeHTML(entry.task)}
                                    </h3>

                                    <div class="entry-meta">

                                        ${formatDate(entry.date)}

                                        ·

                                        ${formatTime(entry.timeIn)}

                                        –

                                        ${formatTime(entry.timeOut)}

                                        ·

                                        ${entry.hours.toFixed(2)} hrs

                                    </div>

                                </div>

                            </div>


                            <p class="entry-description">
                                ${escapeHTML(entry.description)}
                            </p>


                            ${entry.evidenceUrl
                            ?
                            `
                                    <div class="entry-evidence">

                                        <img
                                            src="${entry.evidenceUrl}"
                                            alt="Evidence"
                                        >

                                    </div>
                                    `
                            :
                            ''
                        }


                            <div class="entry-actions">

                                <button
                                    type="button"
                                    data-view-entry="${entry.id}"
                                >
                                    View
                                </button>


                                <button
                                    type="button"
                                    data-edit-entry="${entry.id}"
                                >
                                    Edit
                                </button>


                                <button
                                    type="button"
                                    class="danger"
                                    data-delete-entry="${entry.id}"
                                >
                                    Delete
                                </button>

                            </div>

                        </article>
                    `
                )
                .join('');

    }


    renderPagination(
        totalPages
    );
}



// 
// PAGINATION
// 

function renderPagination(
    totalPages
) {

    if (
        !$('entryPagination')
    ) {
        return;
    }


    if (
        totalPages <=
        1
    ) {

        $('entryPagination').innerHTML =
            '';

        return;
    }


    let html =
        `
        <button
            type="button"
            data-page-number="${entriesCurrentPage - 1}"
            ${entriesCurrentPage === 1 ? 'disabled' : ''}
        >
            ‹
        </button>
        `;


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        html += `
            <button
                type="button"
                data-page-number="${page}"
                class="${page === entriesCurrentPage ? 'active' : ''}"
            >
                ${page}
            </button>
        `;

    }


    html += `
        <button
            type="button"
            data-page-number="${entriesCurrentPage + 1}"
            ${entriesCurrentPage === totalPages ? 'disabled' : ''}
        >
            ›
        </button>
    `;


    $('entryPagination').innerHTML =
        html;
}



// 
// GLOBAL CLICKS
// 

document.addEventListener(
    'click',
    event => {

        const view =
            event.target.closest(
                '[data-view-entry]'
            );


        if (view) {

            openEntryDetail(
                view.dataset
                    .viewEntry
            );

            return;
        }


        const edit =
            event.target.closest(
                '[data-edit-entry]'
            );


        if (edit) {

            const entry =
                entries.find(
                    item =>
                        item.id ===
                        edit.dataset
                            .editEntry
                );


            if (entry) {

                openEntryForm(
                    entry
                );

            }


            return;
        }


        const remove =
            event.target.closest(
                '[data-delete-entry]'
            );


        if (remove) {

            deleteEntry(
                remove.dataset
                    .deleteEntry
            );

            return;
        }


        const pagination =
            event.target.closest(
                '[data-page-number]'
            );


        if (
            pagination &&
            !pagination.disabled
        ) {

            entriesCurrentPage =
                Number(
                    pagination.dataset
                        .pageNumber
                );


            renderEntries();


            return;
        }


        const calendarDay =
            event.target.closest(
                '[data-calendar-date]'
            );


        if (
            calendarDay
        ) {

            openCalendarDay(
                calendarDay.dataset
                    .calendarDate
            );

        }

    }
);



// 
// ENTRY FILTER EVENTS
// 

[
    'search',
    'filterDateFrom',
    'filterDateTo',
    'entrySort',
    'entriesPerPage'
].forEach(
    id => {

        $(id)
            ?.addEventListener(
                'input',
                () => {

                    entriesCurrentPage =
                        1;


                    renderEntries();

                }
            );


        $(id)
            ?.addEventListener(
                'change',
                () => {

                    entriesCurrentPage =
                        1;


                    renderEntries();

                }
            );

    }
);



$('clearEntryFilters')
    ?.addEventListener(
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


            entriesCurrentPage =
                1;


            renderEntries();

        }
    );



// 
// DASHBOARD
// 

function renderDashboard() {

    const totalHours =
        entries.reduce(
            (
                sum,
                entry
            ) =>
                sum +
                Number(
                    entry.hours ||
                    0
                ),
            0
        );


    const remaining =
        Math.max(
            0,
            goal -
            totalHours
        );


    const percentage =
        goal > 0
            ?
            Math.min(
                100,
                totalHours /
                goal *
                100
            )
            :
            0;


    if ($('renderedHours')) {

        $('renderedHours').textContent =
            totalHours.toFixed(2);

    }


    if ($('remainingHours')) {

        $('remainingHours').textContent =
            `${remaining.toFixed(2)} hours remaining`;

    }


    if ($('requiredHours')) {

        $('requiredHours').textContent =
            goal;

    }


    if ($('entryCount')) {

        $('entryCount').textContent =
            entries.length;

    }


    if ($('percentage')) {

        $('percentage').textContent =
            `${percentage.toFixed(1)}%`;

    }


    if ($('goalProgress')) {

        $('goalProgress').value =
            percentage;

    }


    if ($('progressRendered')) {

        $('progressRendered').textContent =
            `${totalHours.toFixed(2)} rendered`;

    }


    if ($('progressRemaining')) {

        $('progressRemaining').textContent =
            `${remaining.toFixed(2)} remaining`;

    }


    const month =
        localDate()
            .slice(
                0,
                7
            );


    if ($('monthLogCount')) {

        $('monthLogCount').textContent =
            entries.filter(
                item =>
                    item.date.startsWith(
                        month
                    )
            ).length;

    }


    const monthAttendance =
        attendances.filter(
            item =>
                item.date.startsWith(
                    month
                )
        );


    if ($('monthAttendanceCount')) {

        $('monthAttendanceCount').textContent =
            monthAttendance.length;

    }


    if ($('monthIncompleteCount')) {

        $('monthIncompleteCount').textContent =
            monthAttendance.filter(
                item =>
                    !item.timeOut
            ).length;

    }


    const recent =
        [...entries]
            .sort(
                (a, b) =>
                    b.date.localeCompare(
                        a.date
                    )
            )
            .slice(
                0,
                4
            );


    if ($('recentEntries')) {

        $('recentEntries').innerHTML =
            recent.length
                ?
                recent
                    .map(
                        entry => `
                            <div class="recent-item">

                                <div>

                                    <strong>
                                        ${escapeHTML(entry.task)}
                                    </strong>

                                    <small>
                                        ${formatShortDate(entry.date)}
                                    </small>

                                </div>

                                <b>
                                    ${entry.hours.toFixed(2)} hrs
                                </b>

                            </div>
                        `
                    )
                    .join('')
                :
                `
                <div class="empty">
                    No daily logs yet.
                </div>
                `;

    }
}



// 
// CALENDAR
// 

function getCalendarState(date) {

    const attendance =
        attendances.find(
            item =>
                item.date ===
                date
        );


    const entry =
        entries.find(
            item =>
                item.date ===
                date
        );


    if (
        attendance &&
        !attendance.timeOut
    ) {

        return {

            className:
                'incomplete',

            text:
                'Incomplete'

        };

    }


    if (
        attendance &&
        entry
    ) {

        return {

            className:
                'complete',

            text:
                'Log + Attendance'

        };

    }


    if (attendance) {

        return {

            className:
                'attendance-only',

            text:
                'Attendance'

        };

    }


    if (entry) {

        return {

            className:
                'log-only',

            text:
                'Log'

        };

    }


    return null;
}



function renderCalendar() {

    if (
        !$('calendarGrid')
    ) {
        return;
    }


    const year =
        calendarDate
            .getFullYear();


    const month =
        calendarDate
            .getMonth();


    $('calendarTitle').textContent =
        calendarDate
            .toLocaleDateString(
                undefined,
                {
                    month:
                        'long',

                    year:
                        'numeric'
                }
            );


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const startDate =
        new Date(
            year,
            month,
            1 -
            firstDay.getDay()
        );


    let html =
        '';


    for (
        let i = 0;
        i < 42;
        i++
    ) {

        const date =
            new Date(
                startDate
            );


        date.setDate(
            startDate.getDate() +
            i
        );


        const dateString =
            localDate(
                date
            );


        const outside =
            date.getMonth() !==
            month;


        const today =
            dateString ===
            localDate();


        const state =
            getCalendarState(
                dateString
            );


        html += `
            <button
                type="button"
                data-calendar-date="${dateString}"
                class="
                    calendar-day
                    ${outside ? 'outside' : ''}
                    ${today ? 'today' : ''}
                "
            >

                <span class="calendar-date-number">
                    ${date.getDate()}
                </span>


                <div class="calendar-day-status">

                    ${state
                ?
                `
                            <span
                                class="calendar-status-item ${state.className}"
                            >
                                ${state.text}
                            </span>
                            `
                :
                ''
            }

                </div>

            </button>
        `;

    }


    $('calendarGrid').innerHTML =
        html;
}



$('calendarPrevious')
    ?.addEventListener(
        'click',
        () => {

            calendarDate =
                new Date(

                    calendarDate
                        .getFullYear(),

                    calendarDate
                        .getMonth() -
                    1,

                    1

                );


            renderCalendar();

        }
    );



$('calendarNext')
    ?.addEventListener(
        'click',
        () => {

            calendarDate =
                new Date(

                    calendarDate
                        .getFullYear(),

                    calendarDate
                        .getMonth() +
                    1,

                    1

                );


            renderCalendar();

        }
    );



$('calendarToday')
    ?.addEventListener(
        'click',
        () => {

            calendarDate =
                new Date();


            renderCalendar();

        }
    );



// 
// CALENDAR DAY VIEW
// 

function openCalendarDay(date) {

    const attendance =
        attendances.find(
            item =>
                item.date ===
                date
        );


    const entry =
        entries.find(
            item =>
                item.date ===
                date
        );


    $('calendarDayTitle').textContent =
        formatDate(
            date
        );


    let html =
        `
        <h3>
            Attendance
        </h3>
        `;


    if (attendance) {

        html += `
            <p>
                <strong>Time In:</strong>
                ${formatTime(attendance.timeIn)}
            </p>

            <p>
                <strong>Time Out:</strong>
                ${formatTime(attendance.timeOut)}
            </p>
        `;

    } else {

        html += `
            <p class="muted">
                No attendance recorded.
            </p>
        `;

    }


    html += `
        <hr>

        <h3>
            Daily Log
        </h3>
    `;


    if (!entry) {

        html += `
            <p class="muted">
                No daily log for this date.
            </p>
        `;

    } else {

        html += `
            <article class="calendar-log-detail">

                <strong>
                    ${escapeHTML(entry.task)}
                </strong>

                <p>
                    ${escapeHTML(entry.description)}
                </p>

                <small>
                    ${entry.hours.toFixed(2)} hours
                </small>

                ${entry.evidenceUrl
                ?
                `
                        <img
                            class="detail-photo"
                            src="${entry.evidenceUrl}"
                            alt="Photo evidence"
                        >
                        `
                :
                ''
            }

            </article>
        `;

    }


    $('calendarDayContent').innerHTML =
        html;


    $('calendarDayDialog')
        .showModal();
}



$('closeCalendarDay')
    ?.addEventListener(
        'click',
        () => {

            $('calendarDayDialog')
                .close();

        }
    );



// 
// REPORT TABS
// 

document
    .querySelectorAll(
        '[data-report-tab]'
    )
    .forEach(
        button => {

            button.addEventListener(
                'click',
                () => {

                    document
                        .querySelectorAll(
                            '.report-tab'
                        )
                        .forEach(
                            tab =>
                                tab.classList.remove(
                                    'active'
                                )
                        );


                    document
                        .querySelectorAll(
                            '.report-section'
                        )
                        .forEach(
                            section =>
                                section.classList.remove(
                                    'active'
                                )
                        );


                    button.classList.add(
                        'active'
                    );


                    if (
                        button.dataset.reportTab ===
                        'weekly'
                    ) {

                        $('weeklyReportSection')
                            .classList
                            .add(
                                'active'
                            );


                        renderWeeklyReport();

                    } else {

                        $('monthlyReportSection')
                            .classList
                            .add(
                                'active'
                            );


                        renderMonthlyReport();

                    }


                    createIcons();

                }
            );

        }
    );



// 
// WEEK HELPERS
// 

function getWeekBounds(
    dateString
) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    const day =
        date.getDay();


    const difference =
        day === 0
            ?
            -6
            :
            1 -
            day;


    const monday =
        new Date(
            date
        );


    monday.setDate(
        date.getDate() +
        difference
    );


    const sunday =
        new Date(
            monday
        );


    sunday.setDate(
        monday.getDate() +
        6
    );


    return {

        start:
            localDate(
                monday
            ),

        end:
            localDate(
                sunday
            )

    };
}



function getWeeklyReportData() {

    const selected =
        $('weekDate')?.value ||
        localDate();


    const {
        start,
        end
    } =
        getWeekBounds(
            selected
        );


    return {

        start,

        end,

        entries:
            entries
                .filter(
                    entry =>
                        entry.date >=
                        start &&
                        entry.date <=
                        end
                )
                .sort(
                    (a, b) =>
                        a.date.localeCompare(
                            b.date
                        )
                ),

        attendance:
            attendances
                .filter(
                    item =>
                        item.date >=
                        start &&
                        item.date <=
                        end
                )

    };
}



function getMonthlyReportData() {

    const month =
        $('reportMonth')?.value ||
        localDate()
            .slice(
                0,
                7
            );


    return {

        month,

        entries:
            entries
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
                ),

        attendance:
            attendances
                .filter(
                    item =>
                        item.date.startsWith(
                            month
                        )
                )

    };
}



// 
// REPORT TABLE
// 

function createReportTable(list) {

    if (!list.length) {
        return '';
    }


    return `
        <div class="report-table-row header">

            <div class="report-table-cell">
                Date
            </div>

            <div class="report-table-cell">
                Accomplishment
            </div>

            <div class="report-table-cell">
                Time In
            </div>

            <div class="report-table-cell">
                Time Out
            </div>

            <div class="report-table-cell">
                Break
            </div>

            <div class="report-table-cell">
                Hours
            </div>

            <div class="report-table-cell">
                Proof
            </div>

        </div>

        ${list
            .map(
                entry => `
                        <div class="report-table-row">

                            <div class="report-table-cell">
                                ${formatShortDate(entry.date)}
                            </div>


                            <div class="report-table-cell">

                                <span class="report-task-title">
                                    ${escapeHTML(entry.task)}
                                </span>

                                <span class="report-task-description">
                                    ${escapeHTML(entry.description)}
                                </span>

                            </div>


                            <div class="report-table-cell">
                                ${formatTime(entry.timeIn)}
                            </div>


                            <div class="report-table-cell">
                                ${formatTime(entry.timeOut)}
                            </div>


                            <div class="report-table-cell">
                                ${entry.breakMinutes} min
                            </div>


                            <div class="report-table-cell">

                                <strong>
                                    ${entry.hours.toFixed(2)}
                                </strong>

                            </div>


                            <div class="report-table-cell">

                                ${entry.evidenceUrl
                        ?
                        `
                                        <button
                                            class="report-proof-thumbnail"
                                            type="button"
                                            data-view-entry="${entry.id}"
                                        >

                                            <img
                                                src="${entry.evidenceUrl}"
                                                alt="Evidence"
                                            >

                                        </button>
                                        `
                        :
                        `
                                        <span class="report-no-proof">
                                            —
                                        </span>
                                        `
                    }

                            </div>

                        </div>
                    `
            )
            .join('')
        }
    `;
}



// 
// WEEKLY REPORT
// 

function renderWeeklyReport() {

    if (
        !$('weeklyReportTable')
    ) {
        return;
    }


    if (
        !$('weekDate').value
    ) {

        $('weekDate').value =
            localDate();

    }


    const report =
        getWeeklyReportData();


    const total =
        report.entries.reduce(
            (
                sum,
                item
            ) =>
                sum +
                item.hours,
            0
        );


    const days =
        report.entries.length;


    const average =
        days
            ?
            total /
            days
            :
            0;


    const attendanceDays =
        report.attendance.filter(
            item =>
                item.timeIn &&
                item.timeOut
        ).length;


    $('weekRange').textContent =
        `${formatDate(report.start)} – ${formatDate(report.end)}`;


    $('weeklyTotalHours').textContent =
        total.toFixed(2);


    $('weeklyLoggedDays').textContent =
        days;


    $('weeklyAverageHours').textContent =
        average.toFixed(2);


    $('weeklyAttendanceDays').textContent =
        attendanceDays;


    $('weeklyStudentName').textContent =
        studentName ||
        'Student';


    const hasEntries =
        report.entries.length >
        0;


    $('weeklyReportEmpty').hidden =
        hasEntries;


    $('weeklyReportTable').hidden =
        !hasEntries;


    $('weeklyReportTable').innerHTML =
        createReportTable(
            report.entries
        );
}



// 
// MONTHLY REPORT
// 

function renderMonthlyReport() {

    if (
        !$('monthlyReportTable')
    ) {
        return;
    }


    if (
        !$('reportMonth').value
    ) {

        $('reportMonth').value =
            localDate()
                .slice(
                    0,
                    7
                );

    }


    const report =
        getMonthlyReportData();


    const total =
        report.entries.reduce(
            (
                sum,
                item
            ) =>
                sum +
                item.hours,
            0
        );


    const days =
        report.entries.length;


    const average =
        days
            ?
            total /
            days
            :
            0;


    const attendanceDays =
        report.attendance.filter(
            item =>
                item.timeIn &&
                item.timeOut
        ).length;


    const monthDate =
        new Date(
            `${report.month}-01T00:00:00`
        );


    $('monthlyPeriodLabel').textContent =
        monthDate.toLocaleDateString(
            undefined,
            {
                month:
                    'long',

                year:
                    'numeric'
            }
        );


    $('monthlyTotalHours').textContent =
        total.toFixed(2);


    $('monthlyLoggedDays').textContent =
        days;


    $('monthlyAverageHours').textContent =
        average.toFixed(2);


    $('monthlyAttendanceDays').textContent =
        attendanceDays;


    $('monthlyStudentName').textContent =
        studentName ||
        'Student';


    const overall =
        entries.reduce(
            (
                sum,
                entry
            ) =>
                sum +
                entry.hours,
            0
        );


    const percentage =
        goal > 0
            ?
            Math.min(
                100,
                overall /
                goal *
                100
            )
            :
            0;


    $('monthlyProgressText').textContent =
        `${overall.toFixed(2)} of ${goal} hours`;


    $('monthlyProgressPercent').textContent =
        `${percentage.toFixed(1)}%`;


    $('monthlyProgressBar').value =
        percentage;


    const hasEntries =
        report.entries.length >
        0;


    $('monthlyReportEmpty').hidden =
        hasEntries;


    $('monthlyReportTable').hidden =
        !hasEntries;


    $('monthlyReportTable').innerHTML =
        createReportTable(
            report.entries
        );
}



$('weekDate')
    ?.addEventListener(
        'change',
        renderWeeklyReport
    );



$('reportMonth')
    ?.addEventListener(
        'change',
        renderMonthlyReport
    );



// 
// CSV EXPORT
// 

function downloadCSV(
    filename,
    list
) {

    const rows = [

        [
            'Date',
            'Task',
            'Time In',
            'Time Out',
            'Break Minutes',
            'Rendered Hours',
            'Description',
            'Evidence'
        ],

        ...list.map(
            entry => [

                entry.date,

                entry.task,

                entry.timeIn,

                entry.timeOut,

                entry.breakMinutes,

                entry.hours,

                entry.description,

                entry.evidencePath
                    ?
                    'Yes'
                    :
                    'No'

            ]
        )

    ];


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            value =>
                                `"${String(value ?? '')
                                    .replaceAll(
                                        '"',
                                        '""'
                                    )}"`
                        )
                        .join(',')
            )
            .join('\n');


    downloadBlob(

        new Blob(
            [
                '\uFEFF',
                csv
            ],
            {
                type:
                    'text/csv;charset=utf-8'
            }
        ),

        filename

    );
}



$('exportWeeklyCsv')
    ?.addEventListener(
        'click',
        () => {

            const report =
                getWeeklyReportData();


            downloadCSV(
                `Over-Time-Weekly-${report.start}.csv`,
                report.entries
            );

        }
    );



$('exportMonthlyCsv')
    ?.addEventListener(
        'click',
        () => {

            const report =
                getMonthlyReportData();


            downloadCSV(
                `Over-Time-${report.month}.csv`,
                report.entries
            );

        }
    );



// 
// WORD EXPORT
// 

$('exportWordButton')
    ?.addEventListener(
        'click',
        () => {

            const report =
                getWeeklyReportData();


            const total =
                report.entries.reduce(
                    (
                        sum,
                        item
                    ) =>
                        sum +
                        item.hours,
                    0
                );


            const rows =
                report.entries
                    .map(
                        entry => `
                            <tr>

                                <td>
                                    ${escapeHTML(formatShortDate(entry.date))}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHTML(entry.task)}
                                    </strong>

                                    <br>

                                    ${escapeHTML(entry.description)}
                                </td>

                                <td>
                                    ${escapeHTML(formatTime(entry.timeIn))}
                                </td>

                                <td>
                                    ${escapeHTML(formatTime(entry.timeOut))}
                                </td>

                                <td>
                                    ${entry.breakMinutes} min
                                </td>

                                <td>
                                    ${entry.hours.toFixed(2)}
                                </td>

                            </tr>
                        `
                    )
                    .join('');


            const html =
                `
                <html>

                <head>
                    <meta charset="UTF-8">
                </head>

                <body>

                    <h1>
                        Weekly OJT Accomplishment Report
                    </h1>

                    <p>
                        <strong>Student:</strong>
                        ${escapeHTML(studentName)}
                    </p>

                    <p>
                        <strong>Period:</strong>
                        ${escapeHTML(formatDate(report.start))}
                        -
                        ${escapeHTML(formatDate(report.end))}
                    </p>

                    <p>
                        <strong>Total:</strong>
                        ${total.toFixed(2)} hours
                    </p>

                    <table
                        border="1"
                        cellspacing="0"
                        cellpadding="6"
                        width="100%"
                    >

                        <thead>

                            <tr>

                                <th>Date</th>
                                <th>Accomplishment</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Break</th>
                                <th>Hours</th>

                            </tr>

                        </thead>

                        <tbody>
                            ${rows}
                        </tbody>

                    </table>

                </body>

                </html>
                `;


            downloadBlob(

                new Blob(
                    [html],
                    {
                        type:
                            'application/msword'
                    }
                ),

                `Over-Time-Weekly-${report.start}.doc`

            );

        }
    );



// 
// PRINT / PDF
// 

function createPrintableTable(
    list
) {

    if (
        !list.length
    ) {

        return `
            <p>
                No records.
            </p>
        `;

    }


    return `
        <table>

            <thead>

                <tr>

                    <th>Date</th>
                    <th>Accomplishment</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Break</th>
                    <th>Hours</th>

                </tr>

            </thead>

            <tbody>

                ${list
            .map(
                entry => `
                                <tr>

                                    <td>
                                        ${escapeHTML(formatShortDate(entry.date))}
                                    </td>

                                    <td>

                                        <strong>
                                            ${escapeHTML(entry.task)}
                                        </strong>

                                        <br>

                                        <small>
                                            ${escapeHTML(entry.description)}
                                        </small>

                                    </td>

                                    <td>
                                        ${escapeHTML(formatTime(entry.timeIn))}
                                    </td>

                                    <td>
                                        ${escapeHTML(formatTime(entry.timeOut))}
                                    </td>

                                    <td>
                                        ${entry.breakMinutes} min
                                    </td>

                                    <td>
                                        ${entry.hours.toFixed(2)}
                                    </td>

                                </tr>
                            `
            )
            .join('')
        }

            </tbody>

        </table>
    `;
}



function printReport(
    title,
    subtitle,
    list
) {

    const popup =
        window.open(
            '',
            '_blank'
        );


    if (!popup) {

        toast(
            'Allow pop-ups to print reports.'
        );

        return;
    }


    const total =
        list.reduce(
            (
                sum,
                item
            ) =>
                sum +
                item.hours,
            0
        );


    popup.document.write(
        `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <title>
                ${escapeHTML(title)}
            </title>

            <style>

                body {
                    font-family:
                        Arial,
                        sans-serif;

                    margin:
                        30px;

                    color:
                        #222;
                }

                .brand {
                    color:
                        #ea6a24;

                    font-weight:
                        bold;
                }

                table {
                    width:
                        100%;

                    border-collapse:
                        collapse;

                    margin-top:
                        20px;
                }

                th,
                td {
                    padding:
                        8px;

                    border:
                        1px solid
                        #ccc;

                    vertical-align:
                        top;

                    text-align:
                        left;

                    font-size:
                        10px;
                }

                th {
                    background:
                        #f4f4f4;
                }

            </style>

        </head>

        <body>

            <div class="brand">
                OVER-TIME
            </div>

            <h1>
                ${escapeHTML(title)}
            </h1>

            <p>
                ${escapeHTML(subtitle)}
            </p>

            <p>
                <strong>Student:</strong>
                ${escapeHTML(studentName)}
            </p>

            <p>
                <strong>Total Rendered:</strong>
                ${total.toFixed(2)} hours
            </p>

            ${createPrintableTable(list)}

        </body>

        </html>
        `
    );


    popup.document.close();


    popup.focus();


    setTimeout(
        () => {

            popup.print();

        },
        300
    );
}



$('printWeeklyButton')
    ?.addEventListener(
        'click',
        () => {

            const report =
                getWeeklyReportData();


            printReport(

                'Weekly OJT Accomplishment Report',

                `${formatDate(report.start)} – ${formatDate(report.end)}`,

                report.entries

            );

        }
    );



$('printMonthlyButton')
    ?.addEventListener(
        'click',
        () => {

            const report =
                getMonthlyReportData();


            const date =
                new Date(
                    `${report.month}-01T00:00:00`
                );


            const monthLabel =
                date.toLocaleDateString(
                    undefined,
                    {
                        month:
                            'long',

                        year:
                            'numeric'
                    }
                );


            printReport(

                'Monthly OJT Accomplishment Report',

                monthLabel,

                report.entries

            );

        }
    );



// 
// DOWNLOAD
// 

function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            'a'
        );


    link.href =
        url;


    link.download =
        filename;


    document.body.appendChild(
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
        1000
    );
}



// 
// ONLINE STATUS
// 

function updateConnectionStatus() {

    if (
        !$('connectionText') ||
        !$('connectionStatus')
    ) {
        return;
    }


    const online =
        navigator.onLine;


    $('connectionText').textContent =
        online
            ?
            'Online'
            :
            'Offline';


    $('connectionStatus')
        .classList
        .toggle(
            'offline',
            !online
        );
}



window.addEventListener(
    'online',
    async () => {

        updateConnectionStatus();


        if (
            currentUser
        ) {

            await refreshCloudData();

        }

    }
);



window.addEventListener(
    'offline',
    updateConnectionStatus
);



// 
// REFRESH CLOUD DATA
// 

async function refreshCloudData() {

    if (
        !currentUser
    ) {
        return;
    }


    try {

        await loadProfile();

        await loadAttendance();

        await loadEntries();


        render();

    } catch (error) {

        console.error(
            'Refresh error:',
            error
        );

    }
}



// Refresh when returning from another tab/device.

window.addEventListener(
    'focus',
    () => {

        if (
            currentUser &&
            navigator.onLine
        ) {

            refreshCloudData();

        }

    }
);



// 
// REMINDER
// 

function checkReminder() {

    if (
        !settings.reminderEnabled ||
        reminderAlreadyShown
    ) {
        return;
    }


    const attendance =
        attendances.find(
            item =>
                item.date ===
                localDate()
        );


    if (
        !attendance?.timeIn ||
        attendance.timeOut
    ) {
        return;
    }


    if (
        currentTime() >=
        settings.reminderTime
    ) {

        reminderAlreadyShown =
            true;


        toast(
            'Reminder: You are still timed in.'
        );

    }
}



setInterval(
    checkReminder,
    60000
);



// 
// PWA INSTALL
// 

window.addEventListener(
    'beforeinstallprompt',
    event => {

        event.preventDefault();


        deferredInstallPrompt =
            event;


        if ($('installAppButton')) {

            $('installAppButton').hidden =
                false;

        }


        if ($('settingsInstallButton')) {

            $('settingsInstallButton').hidden =
                false;

        }

    }
);



async function installApp() {

    if (
        !deferredInstallPrompt
    ) {

        toast(
            'Install is not available yet.'
        );

        return;
    }


    deferredInstallPrompt.prompt();


    await deferredInstallPrompt
        .userChoice;


    deferredInstallPrompt =
        null;


    if ($('installAppButton')) {

        $('installAppButton').hidden =
            true;

    }


    if ($('settingsInstallButton')) {

        $('settingsInstallButton').hidden =
            true;

    }
}



$('installAppButton')
    ?.addEventListener(
        'click',
        installApp
    );



$('settingsInstallButton')
    ?.addEventListener(
        'click',
        installApp
    );



// 
// TODAY
// 

function renderToday() {

    if (
        !$('today')
    ) {
        return;
    }


    $('today').textContent =
        new Date()
            .toLocaleDateString(
                undefined,
                {
                    month:
                        'short',

                    day:
                        'numeric',

                    year:
                        'numeric'
                }
            );
}



// 
// MAIN RENDER
// 

function render() {

    updateStudentInfo();

    renderTodayAttendance();

    renderAttendanceHistory();

    renderDashboard();

    renderEntries();

    renderCalendar();

    renderWeeklyReport();

    renderMonthlyReport();

    createIcons();
}



// 
// AUTH STATE
//
// IMPORTANT:
// Do NOT call openApp() again from SIGNED_IN here.
// loginUser() and checkAuth() already handle it.
// This avoids double loading / stuck sign-in.
// 

supabaseClient.auth
    .onAuthStateChange(
        (
            event,
            session
        ) => {

            console.log(
                'Auth event:',
                event
            );


            if (
                event ===
                'SIGNED_OUT'
            ) {

                currentUser =
                    null;


                entries =
                    [];


                attendances =
                    [];


                if ($('mainApp')) {

                    $('mainApp').hidden =
                        true;

                }


                if ($('authScreen')) {

                    $('authScreen').hidden =
                        false;

                }

            }

        }
    );



// 
// INITIALIZE
// 

async function initialize() {

    renderToday();


    updateConnectionStatus();


    if ($('weekDate')) {

        $('weekDate').value =
            localDate();

    }


    if ($('reportMonth')) {

        $('reportMonth').value =
            localDate()
                .slice(
                    0,
                    7
                );

    }


    try {

        await checkAuth();

    } catch (error) {

        console.error(
            'Initialize error:',
            error
        );

    }


    createIcons();
}



initialize();
