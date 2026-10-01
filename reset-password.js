const SUPABASE_URL =
    'https://gpswmjqsrrsnoxpjzbcj.supabase.co';

const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3dtanFzcnJzbm94cGp6YmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzg5MTYsImV4cCI6MjEwNjMxNDkxNn0.HZBarYW20s4Thk5mP3CS6NvdNhrgS1nrb0_S_YXVYbU';

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


const $ = id =>
    document.getElementById(id);


const message =
    $('resetMessage');

const button =
    $('updatePasswordButton');


let recoveryReady = false;


// Check whether Supabase created a recovery session
async function checkRecoverySession() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .auth
                .getSession();


        console.log(
            'Reset page session:',
            data?.session
        );


        if (error) {
            throw error;
        }


        if (data?.session) {

            recoveryReady = true;

            console.log(
                'Recovery session ready.'
            );

        }

    } catch (error) {

        console.error(
            'Recovery session error:',
            error
        );

    }

}


// Supabase sends PASSWORD_RECOVERY when opened
// through a valid password-reset email.
supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            'Reset auth event:',
            event
        );


        if (
            event === 'PASSWORD_RECOVERY' ||
            session
        ) {

            recoveryReady = true;

        }

    }
);


checkRecoverySession();


button?.addEventListener(
    'click',
    async () => {

        const password =
            $('newPassword')?.value || '';

        const confirmPassword =
            $('confirmNewPassword')?.value || '';


        message.textContent = '';
        message.style.color = '#d9534f';


        if (!password) {

            message.textContent =
                'Enter a new password.';

            return;

        }


        if (password.length < 6) {

            message.textContent =
                'Password must be at least 6 characters.';

            return;

        }


        if (
            password !==
            confirmPassword
        ) {

            message.textContent =
                'Passwords do not match.';

            return;

        }


        button.disabled = true;
        button.textContent =
            'Updating...';


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .updateUser({
                        password
                    });


            console.log(
                'Password update result:',
                data,
                error
            );


            if (error) {
                throw error;
            }


            message.style.color =
                '#2e8b57';

            message.textContent =
                'Password updated successfully. Redirecting...';


            setTimeout(
                () => {

                    window.location.href =
                        '/';

                },
                1500
            );


        } catch (error) {

            console.error(
                'Password update error:',
                error
            );


            message.style.color =
                '#d9534f';


            if (!recoveryReady) {

                message.textContent =
                    'This password reset link is invalid or expired. Please request a new reset link.';

            } else {

                message.textContent =
                    error?.message ||
                    'Unable to update your password.';

            }


        } finally {

            button.disabled = false;

            button.textContent =
                'Update Password';

        }

    }
);