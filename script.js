let currentUser = null;
let token = null;

// ✅ FIX 1: Full Vercel backend URL — replace with YOUR actual Vercel domain
const API_BASE = 'https://lms-backend-kappa-kohl.vercel.app/api';

const loader = document.getElementById('loader');
const message = document.getElementById('message');
const authContainer = document.getElementById('auth-container');
const navbar = document.querySelector('.navbar');

// ─── Mobile Menu ────────────────────────────────────────────────
function toggleMobileMenu() {
    document.getElementById('nav-menu').classList.toggle('active');
}

// ─── Loader ─────────────────────────────────────────────────────
function showLoader() { loader.style.display = 'block'; }
function hideLoader() { loader.style.display = 'none'; }

// ─── Messages ───────────────────────────────────────────────────
function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    setTimeout(() => { message.style.display = 'none'; }, 5000);
}
function hideMessage() { message.style.display = 'none'; }

// ─── API Call ────────────────────────────────────────────────────
// ✅ FIX 2: Build URL safely without breaking https://
function buildUrl(endpoint) {
    const base = API_BASE.replace(/\/+$/, '');
    const path = endpoint.replace(/^\/+/, '');
    return `${base}/${path}`;
}

async function apiCall(method, endpoint, authToken = null, data = null) {
    showLoader();
    hideMessage();

    try {
        const config = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (authToken) config.headers['Authorization'] = `Bearer ${authToken}`;
        if (data) config.body = JSON.stringify(data);

        const url = buildUrl(endpoint);
        console.log(`🔍 ${method} ${url}`);

        const response = await fetch(url, config);
        const result = await response.json();
        console.log(`📡 ${response.status}`, result);

        if (!response.ok) throw new Error(result.detail || `HTTP ${response.status}`);

        hideLoader();
        return result;
    } catch (error) {
        hideLoader();
        console.error('❌ API Error:', error.message);
        showMessage(error.message, 'error');
        throw error;
    }
}

// ─── Page Routing ────────────────────────────────────────────────
function hideAll() {
    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.auth-form').forEach(el => el.classList.add('hidden'));
    document.getElementById('nav-menu').classList.remove('active');
}

// ✅ FIX 3: Properly show/hide navbar based on auth state
function setNavbarVisible(visible) {
    navbar.style.display = visible ? 'block' : 'none';
}

function showLogin() {
    hideAll();
    setNavbarVisible(false);
    authContainer.classList.remove('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

function showSignup() {
    hideAll();
    setNavbarVisible(false);
    authContainer.classList.remove('hidden');
    document.getElementById('signup-form').classList.remove('hidden');
}

function showDashboard() {
    hideAll();
    authContainer.classList.add('hidden');
    setNavbarVisible(true);
    document.getElementById('dashboard').classList.remove('hidden');
    loadDashboard();
}

function showCourses() {
    hideAll();
    authContainer.classList.add('hidden');
    setNavbarVisible(true);
    document.getElementById('courses').classList.remove('hidden');
    loadCourses();
}

function showMyCourses() {
    hideAll();
    authContainer.classList.add('hidden');
    setNavbarVisible(true);
    document.getElementById('my-courses').classList.remove('hidden');
    loadMyCourses();
}

function showProfile() {
    hideAll();
    authContainer.classList.add('hidden');
    setNavbarVisible(true);
    document.getElementById('profile').classList.remove('hidden');
    loadProfile();
}

// ─── Auth Check ──────────────────────────────────────────────────
async function checkAuthStatus() {
    token = localStorage.getItem('token');
    if (token) {
        try {
            const user = await apiCall('GET', 'me', token);
            currentUser = user.logged_in_as;
            showDashboard();
        } catch {
            localStorage.removeItem('token');
            token = null;
            showLogin();
        }
    } else {
        showLogin();
    }
}

// ─── Event Listeners ─────────────────────────────────────────────
function initEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!loginForm || !signupForm || !mobileMenu) {
        setTimeout(initEventListeners, 100);
        return;
    }

    // ✅ LOGIN — token set BEFORE navigating
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('.btn-primary');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        btn.disabled = true;
        btnText.style.opacity = '0';
        btnLoader.style.display = 'inline-block';

        const formData = {
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        };

        try {
            // ✅ FIX 4: Set token & currentUser BEFORE calling showDashboard
            const response = await apiCall('POST', 'login', null, formData);
            token = response.access_token;
            currentUser = formData.email;
            localStorage.setItem('token', token);
            showMessage('Login successful! Welcome back 👋', 'success');
            setTimeout(showDashboard, 800);
        } catch {
            // Error shown by apiCall
        } finally {
            btn.disabled = false;
            btnText.style.opacity = '1';
            btnLoader.style.display = 'none';
        }
    });

    // ✅ SIGNUP — validate password length client-side too
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = signupForm.querySelector('.btn-primary');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        const password = document.getElementById('signupPassword').value;
        if (password.length < 8) {
            showMessage('Password must be at least 8 characters.', 'error');
            return;
        }

        btn.disabled = true;
        btnText.style.opacity = '0';
        btnLoader.style.display = 'inline-block';

        const formData = {
            name: document.getElementById('signupName').value.trim(),
            email: document.getElementById('signupEmail').value.trim(),
            password
        };

        try {
            await apiCall('POST', 'signup', null, formData);
            showMessage('Account created! Redirecting to login...', 'success');
            signupForm.reset();
            setTimeout(showLogin, 1500);
        } catch {
            // Error shown by apiCall
        } finally {
            btn.disabled = false;
            btnText.style.opacity = '1';
            btnLoader.style.display = 'none';
        }
    });

    mobileMenu.addEventListener('click', toggleMobileMenu);
    console.log('✅ Event listeners ready');
}

// ─── Dashboard ───────────────────────────────────────────────────
async function loadDashboard() {
    if (!token) return;
    try {
        const [coursesRes, myCoursesRes] = await Promise.all([
            apiCall('GET', 'courses', token),
            apiCall('GET', 'my-courses', token)
        ]);
        document.getElementById('totalCourses').textContent =
            Array.isArray(coursesRes) ? coursesRes.length : 0;
        document.getElementById('myCoursesCount').textContent =
            Array.isArray(myCoursesRes) ? myCoursesRes.length : 0;

        const subtitle = document.querySelector('#dashboard .page-header p');
        if (subtitle) subtitle.textContent = `Welcome back, ${currentUser} 👋`;
    } catch (err) {
        console.error('Dashboard load failed:', err);
    }
}

// ─── All Courses ─────────────────────────────────────────────────
async function loadCourses() {
    if (!token) return showLogin();
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1">Loading...</p>';

    try {
        const [courses, myCourses] = await Promise.all([
            apiCall('GET', 'courses', token),
            apiCall('GET', 'my-courses', token)
        ]);

        if (!Array.isArray(courses) || courses.length === 0) {
            grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1">No courses available.</p>';
            return;
        }

        const enrolledIds = Array.isArray(myCourses) ? myCourses.map(c => c.id) : [];

        grid.innerHTML = courses.map(course => {
            const enrolled = enrolledIds.includes(course.id);
            return `
            <div class="course-card">
                <h3>${course.title}</h3>
                <button onclick="enrollCourse(${course.id}, this)" ${enrolled ? 'disabled' : ''}>
                    ${enrolled ? '✓ Enrolled' : 'Enroll Now'}
                </button>
            </div>`;
        }).join('');
    } catch {
        grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1">Failed to load courses.</p>';
    }
}

async function enrollCourse(courseId, btn) {
    if (!token) return showLogin();
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enrolling...';
    try {
        await apiCall('POST', `enroll/${courseId}`, token);
        showMessage('Successfully enrolled! 🎉', 'success');
        btn.textContent = '✓ Enrolled';
    } catch {
        btn.disabled = false;
        btn.textContent = original;
    }
}

// ─── My Courses ──────────────────────────────────────────────────
async function loadMyCourses() {
    if (!token) return showLogin();
    const grid = document.getElementById('myCoursesGrid');
    grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1">Loading...</p>';

    try {
        const courses = await apiCall('GET', 'my-courses', token);

        if (!Array.isArray(courses) || courses.length === 0) {
            grid.innerHTML = `
                <p style="text-align:center;color:white;font-size:1.1rem;grid-column:1/-1">
                    No enrolled courses yet.
                    <a href="#" onclick="showCourses()" style="color:#ffd700;font-weight:600;"> Browse Courses →</a>
                </p>`;
            return;
        }

        grid.innerHTML = courses.map(course => `
            <div class="course-card">
                <h3>${course.title}</h3>
                <p style="color:#27ae60;font-weight:600;margin-top:10px;">
                    <i class="fas fa-check-circle"></i> Enrolled
                </p>
            </div>
        `).join('');
    } catch {
        grid.innerHTML = '<p style="color:white;text-align:center;grid-column:1/-1">Failed to load your courses.</p>';
    }
}

// ─── Profile ─────────────────────────────────────────────────────
async function loadProfile() {
    if (!token || !currentUser) return showLogin();
    try {
        const user = await apiCall('GET', `users/${encodeURIComponent(currentUser)}`, token);
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
    } catch {
        showMessage('Failed to load profile.', 'error');
    }
}

function editProfile() {
    showMessage('Edit profile feature coming soon!', 'success');
}

async function deleteAccount() {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
        await apiCall('DELETE', `users/${encodeURIComponent(currentUser)}`, token);
        showMessage('Account deleted.', 'success');
        logout();
    } catch {
        showMessage('Failed to delete account.', 'error');
    }
}

// ─── Logout ──────────────────────────────────────────────────────
function logout() {
    currentUser = null;
    token = null;
    localStorage.removeItem('token');
    showLogin();
}

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 App starting...');
    initEventListeners();
    checkAuthStatus();
});