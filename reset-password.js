const SUPABASE_URL =
    'https://gpswmjqsrrsnoxpjzbcj.supabase.co';

const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwc3dtanFzcnJzbm94cGp6YmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Mzg5MTYsImV4cCI6MjEwNjMxNDkxNn0.HZBarYW20s4Thk5mP3CS6NvdNhrgS1nrb0_S_YXVYbU';



const supabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


const $ = id =>
    document.getElementById(id);


$('updatePasswordButton')?.addEventListener(
    'click',
    async () => {

        const password =
            $('newPassword').value;

        const confirmPassword =
            $('confirmNewPassword').value;

        const message =
            $('resetMessage');

        const button =
            $('updatePasswordButton');


        message.textContent = '';


        if (password.length < 6) {

            message.textContent =
                'Password must be at least 6 characters.';

            return;

        }


        if (password !== confirmPassword) {

            message.textContent =
                'Passwords do not match.';

            return;

        }


        button.disabled = true;
        button.textContent = 'Updating...';


        try {

            const { error } =
                await supabase.auth.updateUser({
                    password
                });


            if (error) {
                throw error;
            }


            message.style.color = '#2e8b57';

            message.textContent =
                'Password updated successfully.';


            setTimeout(
                () => {
                    window.location.href = '/';
                },
                1500
            );


        } catch (error) {

            console.error(
                'Password update error:',
                error
            );


            message.style.color = '#d9534f';

            message.textContent =
                error?.message ||
                'Unable to update password.';


        } finally {

            button.disabled = false;

            button.textContent =
                'Update Password';

        }

    }
);