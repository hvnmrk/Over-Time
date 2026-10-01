


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

let calendarDate =
    new Date();

let entriesCurrentPage = 1;
let entriesPageSize = 10;

let deferredInstallPrompt = null;

let toastTimer = null;

let appOpening = false;

let reminderShownDate = null;


let settings = {

    darkMode:
        false,

    autoBreakEnabled:
        true,

    autoBreakThreshold:
        9,

    autoBreakMinutes:
        60,

    reminderEnabled:
        false,

    reminderTime:
        '17:00'

};



// 
// DOM HELPER
// 

const $ = id =>
    document.getElementById(id);



// 
// SAFE HELPERS
// 

function safeString(value) {

    return String(
        value ?? ''
    );

}



function safeLower(value) {

    return safeString(
        value
    ).toLocaleLowerCase();

}



function localDate(
    date = new Date()
) {

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            '0'
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            '0'
        );


    return `${year}-${month}-${day}`;

}



function currentTime() {

    const now =
        new Date();


    const hour =
        String(
            now.getHours()
        ).padStart(
            2,
            '0'
        );


    const minute =
        String(
            now.getMinutes()
        ).padStart(
            2,
            '0'
        );


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
            weekday:
                'short',

            month:
                'long',

            day:
                'numeric',

            year:
                'numeric'
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
            month:
                'short',

            day:
                'numeric'
        }
    );

}



function formatTime(value) {

    if (!value) {
        return '—';
    }


    const parts =
        safeString(
            value
        ).split(':');


    if (
        parts.length <
        2
    ) {

        return '—';

    }


    const hour =
        Number(
            parts[0]
        );

    const minute =
        Number(
            parts[1]
        );


    if (
        Number.isNaN(
            hour
        ) ||
        Number.isNaN(
            minute
        )
    ) {

        return '—';

    }


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
            hour:
                'numeric',

            minute:
                '2-digit'
        }
    );

}



function escapeHTML(
    value = ''
) {

    return safeString(
        value
    )
        .replaceAll(
            '&',
            '&amp;'
        )
        .replaceAll(
            '<',
            '&lt;'
        )
        .replaceAll(
            '>',
            '&gt;'
        )
        .replaceAll(
            '"',
            '&quot;'
        )
        .replaceAll(
            "'",
            '&#039;'
        );

}



function createIcons() {

    try {

        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            'function'
        ) {

            window.lucide
                .createIcons();

        }

    } catch (error) {

        console.warn(
            'Lucide icon error:',
            error
        );

    }

}



function toast(message) {

    const element =
        $('toast');


    if (!element) {

        console.log(
            message
        );

        return;

    }


    element.textContent =
        safeString(
            message
        );


    element.classList.add(
        'show'
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                element.classList
                    .remove(
                        'show'
                    );

            },
            2600
        );

}



// 
// AUTH VIEW
// 

function showLogin() {

    if ($('loginView')) {

        $('loginView').hidden =
            false;

    }


    if ($('signupView')) {

        $('signupView').hidden =
            true;

    }


    if ($('loginError')) {

        $('loginError').textContent =
            '';

    }


    if ($('signupError')) {

        $('signupError').textContent =
            '';

    }

}



function showSignup() {

    if ($('loginView')) {

        $('loginView').hidden =
            true;

    }


    if ($('signupView')) {

        $('signupView').hidden =
            false;

    }


    if ($('loginError')) {

        $('loginError').textContent =
            '';

    }


    if ($('signupError')) {

        $('signupError').textContent =
            '';

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
        safeString(
            $('signupName')?.value
        ).trim();


    const email =
        safeString(
            $('signupEmail')?.value
        ).trim();


    const password =
        safeString(
            $('signupPassword')?.value
        );


    const confirmPassword =
        safeString(
            $('signupConfirmPassword')?.value
        );


    if ($('signupError')) {

        $('signupError').textContent =
            '';

    }


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
        confirmPassword
    ) {

        $('signupError').textContent =
            'Passwords do not match.';

        return;

    }


    const button =
        $('signupButton');


    if (button) {

        button.disabled =
            true;

        button.textContent =
            'Creating account...';

    }
    if (
        !$('agreeTerms').checked
    ) {

        $('signupError').textContent =
            'Please agree to the Terms of Service and Privacy Policy.';

        return;
    }

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
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
            data?.user &&
            data?.session
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
            'Account created. Check your email and confirm your account.';

    } catch (error) {

        console.error(
            'Signup error:',
            error
        );


        if ($('signupError')) {

            $('signupError').textContent =
                error?.message ||
                'Unable to create account.';

        }

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                'Create Account';

        }

    }

}



$('signupButton')
    ?.addEventListener(
        'click',
        signUpUser
    );



// 
// LOGIN
// 

async function loginUser() {

    if (appOpening) {
        return;
    }


    const email =
        safeString(
            $('loginEmail')?.value
        ).trim();


    const password =
        safeString(
            $('loginPassword')?.value
        );


    if ($('loginError')) {

        $('loginError').textContent =
            '';

    }


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


    if (button) {

        button.disabled =
            true;

        button.textContent =
            'Signing in...';

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .signInWithPassword({

                    email,
                    password

                });


        if (error) {
            throw error;
        }


        if (!data?.user) {

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


        if ($('loginError')) {

            $('loginError').textContent =
                error?.message ||
                'Unable to sign in.';

        }

    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                'Sign In';

        }

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
// CUSTOM LOGOUT DIALOG
// 

$('logoutButton')
    ?.addEventListener(
        'click',
        () => {

            const dialog =
                $('logoutDialog');


            if (
                dialog &&
                typeof dialog.showModal ===
                'function'
            ) {

                dialog.showModal();

                createIcons();

            } else {

                signOutUser();

            }

        }
    );



$('cancelLogoutButton')
    ?.addEventListener(
        'click',
        () => {

            $('logoutDialog')
                ?.close();

        }
    );



$('confirmLogoutButton')
    ?.addEventListener(
        'click',
        signOutUser
    );



async function signOutUser() {

    const button =
        $('confirmLogoutButton');


    if (button) {

        button.disabled =
            true;

        button.textContent =
            'Signing out...';

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .auth
                .signOut();


        if (error) {
            throw error;
        }


        currentUser =
            null;

        entries =
            [];

        attendances =
            [];


        if (
            $('logoutDialog')?.open
        ) {

            $('logoutDialog')
                .close();

        }


        if ($('mainApp')) {

            $('mainApp').hidden =
                true;

        }


        if ($('authScreen')) {

            $('authScreen').hidden =
                false;

        }


        showLogin();


        toast(
            'Signed out successfully.'
        );

    } catch (error) {

        console.error(
            'Logout error:',
            error
        );


        toast(
            error?.message ||
            'Unable to sign out.'
        );

    } finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                `
                <i data-lucide="log-out"></i>
                Sign Out
                `;

        }


        createIcons();

    }

}



// 
// CHECK AUTH
// 

async function checkAuth() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getSession();


        if (error) {
            throw error;
        }


        if (
            data?.session?.user
        ) {

            await openApp(
                data.session.user
            );

            return;

        }


        if ($('authScreen')) {

            $('authScreen').hidden =
                false;

        }


        if ($('mainApp')) {

            $('mainApp').hidden =
                true;

        }

    } catch (error) {

        console.error(
            'Auth check error:',
            error
        );


        if ($('authScreen')) {

            $('authScreen').hidden =
                false;

        }


        if ($('mainApp')) {

            $('mainApp').hidden =
                true;

        }

    }

}



// 
// OPEN APP
// 

async function openApp(user) {

    if (
        !user ||
        appOpening
    ) {

        return;

    }


    appOpening =
        true;


    try {

        currentUser =
            user;


        if ($('profileEmail')) {

            $('profileEmail').textContent =
                safeString(
                    user.email
                );

        }


        if ($('settingsEmail')) {

            $('settingsEmail').textContent =
                safeString(
                    user.email
                );

        }


        await loadProfile();

        await loadAttendance();

        await loadEntries();


        if ($('authScreen')) {

            $('authScreen').hidden =
                true;

        }


        if ($('mainApp')) {

            $('mainApp').hidden =
                false;

        }


        render();

    } catch (error) {

        console.error(
            'App startup error:',
            error
        );


        if ($('loginError')) {

            $('loginError').textContent =
                error?.message ||
                'Signed in, but the app could not load.';

        }


        if ($('authScreen')) {

            $('authScreen').hidden =
                false;

        }


        if ($('mainApp')) {

            $('mainApp').hidden =
                true;

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

    if (!user?.id) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from('profiles')
            .upsert({

                id:
                    user.id,

                student_name:
                    name ||
                    'Student',

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
        throw error;
    }

}



async function loadProfile() {

    if (!currentUser?.id) {
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
            safeString(
                currentUser
                    ?.user_metadata
                    ?.full_name
            ).trim() ||
            'Student';


        await createProfile(
            currentUser,
            fallbackName
        );


        studentName =
            fallbackName;


        goal =
            468;


        applyDarkMode();


        return;

    }


    studentName =
        safeString(
            data.student_name
        ).trim() ||
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
        Number(
            data.auto_break_minutes
        );


    if (
        Number.isNaN(
            settings.autoBreakMinutes
        )
    ) {

        settings.autoBreakMinutes =
            60;

    }


    settings.reminderEnabled =
        Boolean(
            data.reminder_enabled
        );


    settings.reminderTime =
        safeString(
            data.reminder_time
        ).slice(
            0,
            5
        ) ||
        '17:00';


    applyDarkMode();

}



async function saveProfile() {

    if (!currentUser?.id) {
        return;
    }


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
// DARK MODE
// 

function applyDarkMode() {

    document.body
        .classList
        .toggle(
            'dark',
            settings.darkMode
        );

}



// 
// SETTINGS UI
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
                safeString(
                    $('studentName')?.value
                ).trim();


            const requiredHours =
                Number(
                    $('hoursGoal')?.value
                );


            if (
                !name ||
                !Number.isFinite(
                    requiredHours
                ) ||
                requiredHours <=
                0
            ) {

                toast(
                    'Enter valid settings.'
                );

                return;

            }


            studentName =
                name;


            goal =
                requiredHours;


            settings.autoBreakEnabled =
                Boolean(
                    $('autoBreakEnabled')
                        ?.checked
                );


            settings.autoBreakThreshold =
                Number(
                    $('autoBreakThreshold')
                        ?.value
                ) ||
                9;


            settings.autoBreakMinutes =
                Number(
                    $('autoBreakMinutes')
                        ?.value
                ) ||
                0;


            settings.reminderEnabled =
                Boolean(
                    $('reminderEnabled')
                        ?.checked
                );


            settings.reminderTime =
                safeString(
                    $('reminderTime')
                        ?.value
                ) ||
                '17:00';


            settings.darkMode =
                Boolean(
                    $('darkModeToggle')
                        ?.checked
                );


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
                    'Settings error:',
                    error
                );


                toast(
                    error?.message ||
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
                Boolean(
                    $('darkModeToggle')
                        ?.checked
                );


            applyDarkMode();

        }
    );



// 
// STUDENT UI
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

        const first =
            name
                .split(/\s+/)
                .filter(Boolean)[0];


        $('overviewName').textContent =
            first ||
            'Student';

    }


    if ($('profileAvatar')) {

        $('profileAvatar').textContent =
            name
                .split(/\s+/)
                .filter(Boolean)
                .map(
                    part =>
                        part.charAt(0)
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
            page =>
                page.classList
                    .remove(
                        'active'
                    )
        );


    document
        .querySelectorAll(
            '.nav-link'
        )
        .forEach(
            button =>
                button.classList
                    .remove(
                        'active'
                    )
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


    switch (pageId) {

        case 'calendar':

            renderCalendar();

            break;


        case 'attendance':

            renderAttendanceHistory();

            break;


        case 'entries':

            renderEntries();

            break;


        case 'reports':

            renderWeeklyReport();

            renderMonthlyReport();

            break;

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



$('menuButton')
    ?.addEventListener(
        'click',
        () => {

            const open =
                $('sidebar')
                    ?.classList
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
// ATTENDANCE LOAD
// 

async function loadAttendance() {

    if (!currentUser?.id) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from('attendance')
            .select('*')
            .eq(
                'user_id',
                currentUser.id
            )
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
                        safeString(
                            item.attendance_date
                        ),

                    timeIn:
                        item.time_in ||
                        null,

                    timeOut:
                        item.time_out ||
                        null

                })
            );

}



// 
// ATTENDANCE SAVE
// 

async function saveAttendance(
    record
) {

    if (!currentUser?.id) {

        throw new Error(
            'You are not signed in.'
        );

    }


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
            safeString(
                data.attendance_date
            ),

        timeIn:
            data.time_in ||
            null,

        timeOut:
            data.time_out ||
            null

    };

}



// 
// TIME IN
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
                    'You already have attendance for today.'
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
                    'Time In error:',
                    error
                );


                toast(
                    error?.message ||
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


            if (record.timeOut) {

                toast(
                    'You already timed out today.'
                );

                return;

            }


            try {

                const saved =
                    await saveAttendance({

                        ...record,

                        timeOut:
                            currentTime()

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
                    'Time Out error:',
                    error
                );


                toast(
                    error?.message ||
                    'Unable to save Time Out.'
                );

            }

        }
    );



// 
// TODAY ATTENDANCE
// 

function renderTodayAttendance() {

    if (
        !$('attendanceStatus')
    ) {
        return;
    }


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


        if ($('attendanceTimes')) {

            $('attendanceTimes').innerHTML =
                '';

        }


        if ($('quickTimeIn')) {

            $('quickTimeIn').disabled =
                false;

        }


        if ($('quickTimeOut')) {

            $('quickTimeOut').disabled =
                true;

        }


        return;

    }


    if ($('attendanceTimes')) {

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

    }


    if (
        record.timeIn &&
        !record.timeOut
    ) {

        $('attendanceStatus').textContent =
            'Currently timed in.';


        if ($('quickTimeIn')) {

            $('quickTimeIn').disabled =
                true;

        }


        if ($('quickTimeOut')) {

            $('quickTimeOut').disabled =
                false;

        }


        if ($('attendanceWarning')) {

            $('attendanceWarning').hidden =
                false;

        }


        if ($('attendanceWarningText')) {

            $('attendanceWarningText').textContent =
                'Remember to Time Out before leaving.';

        }

    } else {

        $('attendanceStatus').textContent =
            'Attendance completed.';


        if ($('quickTimeIn')) {

            $('quickTimeIn').disabled =
                true;

        }


        if ($('quickTimeOut')) {

            $('quickTimeOut').disabled =
                true;

        }

    }

}



// 
// ATTENDANCE HISTORY
// 

function renderAttendanceHistory() {

    if (!$('attendanceHistory')) {
        return;
    }


    const month =
        safeString(
            $('attendanceMonthFilter')
                ?.value
        );


    let list =
        [...attendances];


    if (month) {

        list =
            list.filter(
                item =>
                    safeString(
                        item.date
                    ).startsWith(
                        month
                    )
            );

    }


    list.sort(
        (a, b) =>
            safeString(
                b.date
            ).localeCompare(
                safeString(
                    a.date
                )
            )
    );


    if (!list.length) {

        $('attendanceHistory').innerHTML =
            `
            <div class="empty">
                No attendance records.
            </div>
            `;

        return;

    }


    $('attendanceHistory').innerHTML =
        list.map(
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
        ).join('');

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

            if ($('attendanceMonthFilter')) {

                $('attendanceMonthFilter').value =
                    '';

            }


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


    const startParts =
        safeString(
            start
        )
            .split(':')
            .map(Number);


    const endParts =
        safeString(
            end
        )
            .split(':')
            .map(Number);


    if (
        startParts.length <
        2 ||
        endParts.length <
        2
    ) {

        return 0;

    }


    const startTotal =
        startParts[0] *
        60 +
        startParts[1];


    const endTotal =
        endParts[0] *
        60 +
        endParts[1];


    if (
        !Number.isFinite(
            startTotal
        ) ||
        !Number.isFinite(
            endTotal
        ) ||
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
        raw <=
        0
    ) {

        return 0;

    }


    const remainingMinutes =
        raw *
        60 -
        Number(
            breakMinutes ||
            0
        );


    if (
        remainingMinutes <=
        0
    ) {

        return 0;

    }


    return Number(
        (
            remainingMinutes /
            60
        ).toFixed(
            2
        )
    );

}



function applyAutoBreak() {

    if (
        !$('breakMinutes')
    ) {
        return;
    }


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

            $('timeIn')?.value,

            $('timeOut')?.value

        );


    if (
        raw >=
        settings.autoBreakThreshold
    ) {

        $('breakMinutes').value =
            settings.autoBreakMinutes;


        if ($('autoBreakNote')) {

            $('autoBreakNote').textContent =
                `${settings.autoBreakMinutes} minute automatic break applied.`;

        }

    } else {

        $('breakMinutes').value =
            0;


        if ($('autoBreakNote')) {

            $('autoBreakNote').textContent =
                '';

        }

    }

}



function updateHoursPreview() {

    if (
        !$('hoursPreview')
    ) {
        return;
    }


    if (
        settings.autoBreakEnabled
    ) {

        applyAutoBreak();

    }


    const hours =
        calculateHours(

            $('timeIn')?.value,

            $('timeOut')?.value,

            $('breakMinutes')?.value

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

            if (!$('hoursPreview')) {
                return;
            }


            const hours =
                calculateHours(

                    $('timeIn')?.value,

                    $('timeOut')?.value,

                    $('breakMinutes')?.value

                );


            $('hoursPreview').textContent =
                `Rendered hours: ${hours.toFixed(2)} hrs`;

        }
    );



$('timeInNow')
    ?.addEventListener(
        'click',
        () => {

            if ($('timeIn')) {

                $('timeIn').value =
                    currentTime();

            }


            updateHoursPreview();

        }
    );



$('timeOutNow')
    ?.addEventListener(
        'click',
        () => {

            if ($('timeOut')) {

                $('timeOut').value =
                    currentTime();

            }


            updateHoursPreview();

        }
    );



// 
// STORAGE
// 

async function uploadEvidence(file) {

    if (
        !file ||
        !currentUser?.id
    ) {

        return null;

    }


    const filename =
        safeString(
            file.name
        );


    const pieces =
        filename.split('.');


    const extension =
        pieces.length >
            1
            ?
            safeLower(
                pieces[
                pieces.length -
                1
                ]
            )
            :
            'jpg';


    const allowed =
        [
            'jpg',
            'jpeg',
            'png',
            'webp'
        ];


    const safeExtension =
        allowed.includes(
            extension
        )
            ?
            extension
            :
            'jpg';


    const randomPart =
        typeof crypto.randomUUID ===
            'function'
            ?
            crypto.randomUUID()
            :
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`;


    const path =
        `${currentUser.id}/${Date.now()}-${randomPart}.${safeExtension}`;


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



async function getEvidenceURL(path) {

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
                60 *
                60
            );


    if (error) {

        console.warn(
            'Evidence URL error:',
            error
        );


        return null;

    }


    return data?.signedUrl ||
        null;

}



async function deleteEvidence(path) {

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

        console.warn(
            'Evidence delete error:',
            error
        );

    }

}



// 
// LOAD ENTRIES
// 

async function loadEntries() {

    if (!currentUser?.id) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from('entries')
            .select('*')
            .eq(
                'user_id',
                currentUser.id
            )
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
        (data || []).map(
            item => ({

                id:
                    item.id,

                date:
                    safeString(
                        item.entry_date
                    ),

                task:
                    safeString(
                        item.task
                    ),

                timeIn:
                    item.time_in ||
                    null,

                timeOut:
                    item.time_out ||
                    null,

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
                    safeString(
                        item.description
                    ),

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
                    ?.files?.[0] ||
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

                if ($('attachmentNote')) {

                    $('attachmentNote').textContent =
                        existingEvidencePath
                            ?
                            'Current photo evidence attached.'
                            :
                            '';

                }


                if (
                    existingEvidenceUrl &&
                    $('evidencePreviewImage')
                ) {

                    $('evidencePreviewImage').src =
                        existingEvidenceUrl;


                    $('evidencePreview').hidden =
                        false;

                } else if (
                    $('evidencePreview')
                ) {

                    $('evidencePreview').hidden =
                        true;

                }


                return;

            }


            if ($('attachmentNote')) {

                $('attachmentNote').textContent =
                    `Selected: ${safeString(file.name)}`;

            }


            selectedEvidencePreviewURL =
                URL.createObjectURL(
                    file
                );


            if ($('evidencePreviewImage')) {

                $('evidencePreviewImage').src =
                    selectedEvidencePreviewURL;

            }


            if ($('evidencePreview')) {

                $('evidencePreview').hidden =
                    false;

            }

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


    $('entryForm')
        ?.reset();


    if ($('entryDate')) {

        $('entryDate').value =
            localDate();

    }


    if ($('breakMinutes')) {

        $('breakMinutes').value =
            settings.autoBreakMinutes;

    }


    if ($('formTitle')) {

        $('formTitle').textContent =
            'New Entry';

    }


    if ($('formError')) {

        $('formError').textContent =
            '';

    }


    if ($('attachmentNote')) {

        $('attachmentNote').textContent =
            '';

    }


    if ($('evidencePreview')) {

        $('evidencePreview').hidden =
            true;

    }


    if ($('evidencePreviewImage')) {

        $('evidencePreviewImage').src =
            '';

    }


    if ($('autoBreakNote')) {

        $('autoBreakNote').textContent =
            '';

    }


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
        ?.showModal();

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
                ?.close();

        }
    );



$('cancelForm')
    ?.addEventListener(
        'click',
        () => {

            $('entryDialog')
                ?.close();

        }
    );



// 
// DUPLICATE LOG CHECK
// 

async function checkDuplicateLogDate(
    date,
    ignoreId = null
) {

    if (
        !currentUser?.id ||
        !date
    ) {

        return false;

    }


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
                date
            );


    if (ignoreId) {

        query =
            query.neq(
                'id',
                ignoreId
            );

    }


    const {
        data,
        error
    } =
        await query.limit(
            1
        );


    if (error) {
        throw error;
    }


    return Array.isArray(
        data
    ) &&
        data.length >
        0;

}



// 
// SAVE ENTRY
// ONE LOG PER DATE
// 

$('entryForm')
    ?.addEventListener(
        'submit',
        async event => {

            event.preventDefault();


            if ($('formError')) {

                $('formError').textContent =
                    '';

            }


            const entry = {

                date:
                    safeString(
                        $('entryDate')?.value
                    ),

                task:
                    safeString(
                        $('task')?.value
                    ).trim(),

                timeIn:
                    safeString(
                        $('timeIn')?.value
                    ),

                timeOut:
                    safeString(
                        $('timeOut')?.value
                    ),

                breakMinutes:
                    Number(
                        $('breakMinutes')?.value
                    ) ||
                    0,

                description:
                    safeString(
                        $('description')?.value
                    ).trim()

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


            const localDuplicate =
                entries.some(
                    item =>
                        item.date ===
                        entry.date &&
                        item.id !==
                        editingId
                );


            if (localDuplicate) {

                $('formError').textContent =
                    'A daily log already exists for this date. Edit the existing log instead.';

                return;

            }


            const saveButton =
                $('saveButton');


            if (saveButton) {

                saveButton.disabled =
                    true;

                saveButton.textContent =
                    'Checking date...';

            }


            let newEvidencePath =
                existingEvidencePath;


            let uploadedNewEvidence =
                false;


            try {

                const cloudDuplicate =
                    await checkDuplicateLogDate(

                        entry.date,

                        editingId

                    );


                if (cloudDuplicate) {

                    $('formError').textContent =
                        'A daily log already exists for this date. Edit the existing log instead.';

                    return;

                }


                if (saveButton) {

                    saveButton.textContent =
                        'Saving...';

                }


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


                if (editingId) {

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


                const wasEditing =
                    Boolean(
                        editingId
                    );


                await loadEntries();


                $('entryDialog')
                    ?.close();


                editingId =
                    null;


                selectedEvidenceFile =
                    null;


                existingEvidencePath =
                    null;


                existingEvidenceUrl =
                    null;


                render();


                toast(
                    wasEditing
                        ?
                        'Entry updated.'
                        :
                        'Entry saved.'
                );

            } catch (error) {

                console.error(
                    'Entry save error:',
                    error
                );


                if (
                    uploadedNewEvidence &&
                    newEvidencePath &&
                    newEvidencePath !==
                    existingEvidencePath
                ) {

                    await deleteEvidence(
                        newEvidencePath
                    );

                }


                if ($('formError')) {

                    $('formError').textContent =
                        error?.message ||
                        'Unable to save entry.';

                }

            } finally {

                if (saveButton) {

                    saveButton.disabled =
                        false;

                    saveButton.textContent =
                        'Save Entry';

                }

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


    const confirmed =
        window.confirm(
            'Delete this daily log?'
        );


    if (!confirmed) {
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
            'Delete error:',
            error
        );


        toast(
            error?.message ||
            'Unable to delete log.'
        );

    }

}



// 
// ENTRY DETAIL
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


    if ($('detailTitle')) {

        $('detailTitle').textContent =
            entry.task ||
            'Daily Log';

    }


    if ($('detailContent')) {

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

    }


    $('detailDialog')
        ?.showModal();

}



$('closeDetails')
    ?.addEventListener(
        'click',
        () => {

            $('detailDialog')
                ?.close();

        }
    );



// 
// FILTER ENTRIES
// 

function getFilteredEntries() {

    const search =
        safeLower(
            $('search')
                ?.value
        ).trim();


    const from =
        safeString(
            $('filterDateFrom')
                ?.value
        );


    const to =
        safeString(
            $('filterDateTo')
                ?.value
        );


    const sort =
        safeString(
            $('entrySort')
                ?.value
        ) ||
        'newest';


    let list =
        entries.filter(
            entry => {

                const text =
                    safeLower(
                        `${safeString(entry.task)} ${safeString(entry.description)}`
                    );


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


    switch (sort) {

        case 'oldest':

            list.sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            );

            break;


        case 'hours-high':

            list.sort(
                (a, b) =>
                    b.hours -
                    a.hours
            );

            break;


        case 'hours-low':

            list.sort(
                (a, b) =>
                    a.hours -
                    b.hours
            );

            break;


        default:

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
// RENDER ENTRIES
// 

function renderEntries() {

    if (!$('entriesList')) {
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


    entriesCurrentPage =
        Math.min(
            entriesCurrentPage,
            totalPages
        );


    const start =
        (
            entriesCurrentPage -
            1
        ) *
        entriesPageSize;


    const pageItems =
        list.slice(

            start,

            start +
            entriesPageSize

        );


    if ($('entriesResultCount')) {

        $('entriesResultCount').textContent =
            `${list.length} ${list.length ===
                1
                ?
                'entry'
                :
                'entries'
            }`;

    }


    if (!pageItems.length) {

        $('entriesList').innerHTML =
            `
            <div class="empty">
                No entries found.
            </div>
            `;

    } else {

        $('entriesList').innerHTML =
            pageItems.map(
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
            ).join('');

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

    if (!$('entryPagination')) {
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
        page <=
        totalPages;
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
// GLOBAL DYNAMIC CLICKS
// 

document.addEventListener(
    'click',
    event => {

        const target =
            event.target;


        if (
            !(target instanceof Element)
        ) {

            return;

        }


        const viewButton =
            target.closest(
                '[data-view-entry]'
            );


        if (viewButton) {

            openEntryDetail(
                viewButton.dataset
                    .viewEntry
            );

            return;

        }


        const editButton =
            target.closest(
                '[data-edit-entry]'
            );


        if (editButton) {

            const entry =
                entries.find(
                    item =>
                        item.id ===
                        editButton.dataset
                            .editEntry
                );


            if (entry) {

                openEntryForm(
                    entry
                );

            }


            return;

        }


        const deleteButton =
            target.closest(
                '[data-delete-entry]'
            );


        if (deleteButton) {

            deleteEntry(
                deleteButton.dataset
                    .deleteEntry
            );

            return;

        }


        const pageButton =
            target.closest(
                '[data-page-number]'
            );


        if (
            pageButton &&
            !pageButton.disabled
        ) {

            entriesCurrentPage =
                Number(
                    pageButton.dataset
                        .pageNumber
                ) ||
                1;


            renderEntries();


            return;

        }


        const calendarButton =
            target.closest(
                '[data-calendar-date]'
            );


        if (calendarButton) {

            openCalendarDay(
                calendarButton.dataset
                    .calendarDate
            );

        }

    }
);



// 
// FILTER EVENTS
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

            if ($('search')) {

                $('search').value =
                    '';

            }


            if ($('filterDateFrom')) {

                $('filterDateFrom').value =
                    '';

            }


            if ($('filterDateTo')) {

                $('filterDateTo').value =
                    '';

            }


            if ($('entrySort')) {

                $('entrySort').value =
                    'newest';

            }


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


    const remaining =
        Math.max(
            0,
            goal -
            totalHours
        );


    const percentage =
        goal >
            0
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
            totalHours.toFixed(
                2
            );

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


    const currentMonth =
        localDate().slice(
            0,
            7
        );


    if ($('monthLogCount')) {

        $('monthLogCount').textContent =
            entries.filter(
                item =>
                    item.date.startsWith(
                        currentMonth
                    )
            ).length;

    }


    const monthAttendance =
        attendances.filter(
            item =>
                item.date.startsWith(
                    currentMonth
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


    if ($('recentEntries')) {

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


        $('recentEntries').innerHTML =
            recent.length
                ?
                recent.map(
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
                ).join('')
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
                'Complete'

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
        !$('calendarGrid') ||
        !$('calendarTitle')
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
        i <
        42;
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


        const isToday =
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
                    ${isToday ? 'today' : ''}
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
// CALENDAR DAY
// 

function openCalendarDay(date) {

    if (
        !$('calendarDayDialog')
    ) {
        return;
    }


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


    if ($('calendarDayTitle')) {

        $('calendarDayTitle').textContent =
            formatDate(
                date
            );

    }


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


    if (entry) {

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

    } else {

        html += `
            <p class="muted">
                No daily log for this date.
            </p>
        `;

    }


    if ($('calendarDayContent')) {

        $('calendarDayContent').innerHTML =
            html;

    }


    $('calendarDayDialog')
        .showModal();

}



$('closeCalendarDay')
    ?.addEventListener(
        'click',
        () => {

            $('calendarDayDialog')
                ?.close();

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
                                tab.classList
                                    .remove(
                                        'active'
                                    )
                        );


                    document
                        .querySelectorAll(
                            '.report-section'
                        )
                        .forEach(
                            section =>
                                section.classList
                                    .remove(
                                        'active'
                                    )
                        );


                    button.classList
                        .add(
                            'active'
                        );


                    if (
                        button.dataset.reportTab ===
                        'monthly'
                    ) {

                        $('monthlyReportSection')
                            ?.classList
                            .add(
                                'active'
                            );


                        renderMonthlyReport();

                    } else {

                        $('weeklyReportSection')
                            ?.classList
                            .add(
                                'active'
                            );


                        renderWeeklyReport();

                    }


                    createIcons();

                }
            );

        }
    );



// 
// REPORT DATA
// 

function getWeekBounds(dateString) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );


    const day =
        date.getDay();


    const difference =
        day ===
            0
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
        safeString(
            $('weekDate')
                ?.value
        ) ||
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
        safeString(
            $('reportMonth')
                ?.value
        ) ||
        localDate().slice(
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

        ${list.map(
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
                '—'
            }

                        </div>

                    </div>
                `
    ).join('')
        }
    `;

}



// 
// WEEKLY REPORT
// 

function renderWeeklyReport() {

    if (!$('weeklyReportTable')) {
        return;
    }


    if (
        $('weekDate') &&
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
                entry
            ) =>
                sum +
                Number(
                    entry.hours ||
                    0
                ),
            0
        );


    const days =
        report.entries.length;


    const average =
        days >
            0
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


    if ($('weekRange')) {

        $('weekRange').textContent =
            `${formatDate(report.start)} – ${formatDate(report.end)}`;

    }


    if ($('weeklyTotalHours')) {

        $('weeklyTotalHours').textContent =
            total.toFixed(
                2
            );

    }


    if ($('weeklyLoggedDays')) {

        $('weeklyLoggedDays').textContent =
            days;

    }


    if ($('weeklyAverageHours')) {

        $('weeklyAverageHours').textContent =
            average.toFixed(
                2
            );

    }


    if ($('weeklyAttendanceDays')) {

        $('weeklyAttendanceDays').textContent =
            attendanceDays;

    }


    if ($('weeklyStudentName')) {

        $('weeklyStudentName').textContent =
            studentName ||
            'Student';

    }


    const hasEntries =
        report.entries.length >
        0;


    if ($('weeklyReportEmpty')) {

        $('weeklyReportEmpty').hidden =
            hasEntries;

    }


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

    if (!$('monthlyReportTable')) {
        return;
    }


    if (
        $('reportMonth') &&
        !$('reportMonth').value
    ) {

        $('reportMonth').value =
            localDate().slice(
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
                entry
            ) =>
                sum +
                Number(
                    entry.hours ||
                    0
                ),
            0
        );


    const days =
        report.entries.length;


    const average =
        days >
            0
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


    if ($('monthlyPeriodLabel')) {

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

    }


    if ($('monthlyTotalHours')) {

        $('monthlyTotalHours').textContent =
            total.toFixed(
                2
            );

    }


    if ($('monthlyLoggedDays')) {

        $('monthlyLoggedDays').textContent =
            days;

    }


    if ($('monthlyAverageHours')) {

        $('monthlyAverageHours').textContent =
            average.toFixed(
                2
            );

    }


    if ($('monthlyAttendanceDays')) {

        $('monthlyAttendanceDays').textContent =
            attendanceDays;

    }


    if ($('monthlyStudentName')) {

        $('monthlyStudentName').textContent =
            studentName ||
            'Student';

    }


    const overall =
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


    const progress =
        goal >
            0
            ?
            Math.min(
                100,
                overall /
                goal *
                100
            )
            :
            0;


    if ($('monthlyProgressText')) {

        $('monthlyProgressText').textContent =
            `${overall.toFixed(2)} of ${goal} hours`;

    }


    if ($('monthlyProgressPercent')) {

        $('monthlyProgressPercent').textContent =
            `${progress.toFixed(1)}%`;

    }


    if ($('monthlyProgressBar')) {

        $('monthlyProgressBar').value =
            progress;

    }


    const hasEntries =
        report.entries.length >
        0;


    if ($('monthlyReportEmpty')) {

        $('monthlyReportEmpty').hidden =
            hasEntries;

    }


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
// CSV
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
            'Photo Evidence'
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
        rows.map(
            row =>
                row.map(
                    value =>
                        `"${safeString(value)
                            .replaceAll(
                                '"',
                                '""'
                            )}"`
                ).join(',')
        ).join('\n');


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


            const rows =
                report.entries.map(
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
                ).join('');


            const html =
                `
                <!DOCTYPE html>

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
                        –
                        ${escapeHTML(formatDate(report.end))}
                    </p>

                    <table
                        border="1"
                        cellpadding="6"
                        cellspacing="0"
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
// PRINT
// 

function createPrintableTable(list) {

    if (!list.length) {

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

                ${list.map(
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
    ).join('')
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
                Number(
                    item.hours ||
                    0
                ),
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

                    text-align:
                        left;

                    vertical-align:
                        top;

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

                <strong>
                    Student:
                </strong>

                ${escapeHTML(studentName)}

            </p>

            <p>

                <strong>
                    Total Rendered:
                </strong>

                ${total.toFixed(2)}
                hours

            </p>

            ${createPrintableTable(list)}

        </body>

        </html>
        `
    );


    popup.document.close();


    setTimeout(
        () => {

            popup.focus();

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


            const label =
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

                label,

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


    const anchor =
        document.createElement(
            'a'
        );


    anchor.href =
        url;


    anchor.download =
        filename;


    document.body.appendChild(
        anchor
    );


    anchor.click();


    anchor.remove();


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
// CONNECTION STATUS
// 

function updateConnectionStatus() {

    const online =
        navigator.onLine;


    if ($('connectionText')) {

        $('connectionText').textContent =
            online
                ?
                'Online'
                :
                'Offline';

    }


    if ($('connectionStatus')) {

        $('connectionStatus')
            .classList
            .toggle(
                'offline',
                !online
            );

    }

}



window.addEventListener(
    'online',
    async () => {

        updateConnectionStatus();


        if (currentUser) {

            await refreshCloudData();

        }

    }
);



window.addEventListener(
    'offline',
    updateConnectionStatus
);



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
// CLOUD REFRESH
// 

async function refreshCloudData() {

    if (
        !currentUser?.id ||
        appOpening
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
            'Cloud refresh error:',
            error
        );

    }

}



// 
// REMINDER
// 

function checkReminder() {

    if (
        !settings.reminderEnabled
    ) {

        return;

    }


    const today =
        localDate();


    if (
        reminderShownDate ===
        today
    ) {

        return;

    }


    const attendance =
        attendances.find(
            item =>
                item.date ===
                today
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

        reminderShownDate =
            today;


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
            'Install option is not currently available.'
        );

        return;

    }


    try {

        deferredInstallPrompt
            .prompt();


        const choice =
            await deferredInstallPrompt
                .userChoice;


        console.log(
            'PWA install:',
            choice?.outcome ||
            'unknown'
        );

    } catch (error) {

        console.warn(
            'Install prompt error:',
            error
        );

    } finally {

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
// SERVICE WORKER
// 

if (
    'serviceWorker' in
    navigator
) {

    window.addEventListener(
        'load',
        async () => {

            try {

                const registration =
                    await navigator
                        .serviceWorker
                        .register(
                            '/service-worker.js'
                        );


                console.log(
                    'Service Worker registered:',
                    registration.scope
                );

            } catch (error) {

                console.error(
                    'Service Worker error:',
                    error
                );

            }

        }
    );

}



// 
// TODAY
// 

function renderToday() {

    if (!$('today')) {
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
// AUTH STATE LISTENER
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


            /*
             * IMPORTANT:
             * We do NOT open the app again on SIGNED_IN.
             *
             * loginUser() and checkAuth() already do that.
             * This prevents duplicate loading and auth loops.
             */

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


            if (
                event ===
                'TOKEN_REFRESHED' &&
                session?.user
            ) {

                currentUser =
                    session.user;

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
            localDate().slice(
                0,
                7
            );

    }


    try {

        await checkAuth();

    } catch (error) {

        console.error(
            'Initialization error:',
            error
        );

    }


    createIcons();

}
$('forgotPasswordButton')?.addEventListener(
    'click',
    () => {

        if ($('resetEmail')) {
            $('resetEmail').value =
                $('loginEmail')?.value || '';
        }

        if ($('resetPasswordMessage')) {
            $('resetPasswordMessage').textContent = '';
        }

        $('forgotPasswordDialog')?.showModal();

    }
);


$('cancelResetPassword')?.addEventListener(
    'click',
    () => {

        $('forgotPasswordDialog')?.close();

    }
);


$('sendResetPassword')?.addEventListener(
    'click',
    async () => {

        const email =
            safeString(
                $('resetEmail')?.value
            ).trim();

        const message =
            $('resetPasswordMessage');

        const button =
            $('sendResetPassword');


        if (!email) {

            if (message) {
                message.style.color = '#d9534f';

                message.textContent =
                    'Please enter your email address.';
            }

            return;

        }


        if (button) {

            button.disabled = true;
            button.textContent = 'Sending...';

        }


        if (message) {

            message.textContent = '';
            message.style.color = '';

        }


        try {

            console.log(
                'Sending password reset to:',
                email
            );


            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                `${window.location.origin}/reset-password.html`
                        }
                    );


            console.log(
                'Password reset result:',
                data
            );


            if (error) {
                throw error;
            }


            if (message) {

                message.style.color =
                    '#2e8b57';

                message.textContent =
                    'If an account exists for this email, a reset link has been sent. Please check your inbox.';

            }


        } catch (error) {

            console.error(
                'Password reset error:',
                error
            );


            if (message) {

                message.style.color =
                    '#d9534f';

                message.textContent =
                    error?.message ||
                    'Unable to send reset email. Please try again.';

            }


        } finally {

            if (button) {

                button.disabled = false;

                button.textContent =
                    'Send Reset Link';

            }

        }

    }
);