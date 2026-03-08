let currentUser = null;
let token = null;
const API_BASE = '/api';  // FIXED: No trailing slash

const loader = document.getElementById('loader');
const message = document.getElementById('message');
const authContainer = document.getElementById('auth-container');

function toggleMobileMenu() {
    document.getElementById('nav-menu').classList.toggle('active');
}

function showLoader() {
    loader.style.display = 'block';
}

function hideLoader() {
    loader.style.display = 'none';
}

function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 5000);
}

function hideMessage() {
    message.style.display = 'none';
}

// FIXED: Wait for ALL elements to exist
function initEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const mobileMenu = document.getElementById('mobile-menu');
    const btnPrimaries = document.querySelectorAll('.btn-primary');

    if (!loginForm || !signupForm || !mobileMenu) {
        console.error('❌ Forms not found, retrying...');
        setTimeout(initEventListeners, 100);
        return;
    }

    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.querySelector('#loginForm .btn-primary');
        btn.classList.add('loading');
        
        const formData = {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        };
        
        try {
            const response = await apiCall('POST', 'login', null, formData);
            token = response.access_token;
            currentUser = formData.email;
            localStorage.setItem('token', token);
            btn.classList.remove('loading');
            showDashboard();
            loadDashboard();
        } catch (error) {
            btn.classList.remove('loading');
            console.error('Login failed:', error);
        }
    });

    // Signup form  
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.querySelector('#signupForm .btn-primary');
        btn.classList.add('loading');
        
        const formData = {
            name: document.getElementById('signupName').value,
            email: document.getElementById('signupEmail').value,
            password: document.getElementById('signupPassword').value
        };
        
        try {
            await apiCall('POST', 'signup', null, formData);
            btn.classList.remove('loading');
            showMessage('Account created successfully! Please login.', 'success');
            setTimeout(showLogin, 1500);
        } catch (error) {
            btn.classList.remove('loading');
            console.error('Signup failed:', error);
        }
    });

    // Mobile menu
    mobileMenu.addEventListener('click', toggleMobileMenu);

    // Button loaders
    btnPrimaries.forEach(btn => {
        btn.addEventListener('click', function() {
            this.classList.add('loading');
        });
    });

    console.log('✅ Event listeners attached');
}

// FIXED API CALL
async function apiCall(method, endpoint, token = null, data = null) {
    showLoader();
    hideMessage();
    
    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (data) {
            config.body = JSON.stringify(data);
        }
        
        const url = `${API_BASE}/${endpoint}`.replace(/\/+/g, '/');
        console.log('🔍 Calling:', url);
        
        const response = await fetch(url, config);
        const result = await response.json();
        
        console.log('📡 Status:', response.status, result);
        
        if (!response.ok) {
            throw new Error(result.detail || `HTTP ${response.status}`);
        }
        
        hideLoader();
        return result;
    } catch (error) {
        console.error('❌ API Error:', error);
        hideLoader();
        showMessage(error.message, 'error');
        throw error;
    }
}

function hideAll() {
    document.querySelectorAll('.page-content, .auth-form').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById('nav-menu').classList.remove('active');
}

function showLogin() {
    hideAll();
    document.getElementById('login-form').classList.remove('hidden');
    authContainer.scrollIntoView({ behavior: 'smooth' });
}

function showSignup() {
    hideAll();
    document.getElementById('signup-form').classList.remove('hidden');
    authContainer.scrollIntoView({ behavior: 'smooth' });
}

function showDashboard() {
    hideAll();
    document.getElementById('dashboard').classList.remove('hidden');
    if (currentUser) loadDashboard();
}

function showCourses() {
    hideAll();
    document.getElementById('courses').classList.remove('hidden');
    loadCourses();
}

function showMyCourses() {
    hideAll();
    document.getElementById('my-courses').classList.remove('hidden');
    loadMyCourses();
}

function showProfile() {
    hideAll();
    document.getElementById('profile').classList.remove('hidden');
    loadProfile();
}

async function checkAuthStatus() {
    token = localStorage.getItem('token');
    if (token) {
        try {
            const user = await apiCall('GET', 'me', token);
            if (user) {
                currentUser = user.logged_in_as;
                showDashboard();
                loadDashboard();
            } else {
                showLogin();
            }
        } catch (error) {
            localStorage.removeItem('token');
            showLogin();
        }
    } else {
        showLogin();
    }
}

// FIXED: Proper initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 DOM loaded');
    initEventListeners();  // Wait for forms to exist
    checkAuthStatus();
});

// ... rest of your functions (loadDashboard, loadCourses, etc.) stay EXACTLY the same ...
async function loadDashboard() {
    try {
        const [coursesRes, myCoursesRes] = await Promise.all([
            apiCall('GET', 'courses', token),
            apiCall('GET', 'my-courses', token)
        ]);
        
        document.getElementById('totalCourses').textContent = 
            Array.isArray(coursesRes) ? coursesRes.length : 0;
        document.getElementById('myCoursesCount').textContent = 
            Array.isArray(myCoursesRes) ? myCoursesRes.length : 0;
    } catch (error) {
        console.error('Dashboard load failed:', error);
    }
}

async function loadCourses() {
    try {
        const courses = await apiCall('GET', 'courses', token);
        const coursesGrid = document.getElementById('coursesGrid');
        
        if (!Array.isArray(courses) || courses.length === 0) {
            coursesGrid.innerHTML = '<p style="text-align: center; color: white; font-size: 1.2rem; grid-column: 1/-1;">No courses available</p>';
            return;
        }
        
        const myCourses = await apiCall('GET', 'my-courses', token);
        const enrolledCourses = myCourses.map(c => c.id);
        
        coursesGrid.innerHTML = courses.map(course => `
            <div class="course-card">
                <h3>${course.title}</h3>
                <button onclick="enrollCourse(${course.id})" 
                        ${enrolledCourses.includes(course.id) ? 'disabled' : ''}>
                    ${enrolledCourses.includes(course.id) ? 'Enrolled ✓' : 'Enroll Now'}
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Courses load failed:', error);
    }
}

async function enrollCourse(courseId) {
    try {
        await apiCall('POST', `enroll/${courseId}`, token);
        showMessage('Successfully enrolled in course!', 'success');
        setTimeout(loadCourses, 1000);
    } catch (error) {
        console.error('Enrollment failed:', error);
    }
}

async function loadMyCourses() {
    try {
        const courses = await apiCall('GET', 'my-courses', token);
        const grid = document.getElementById('myCoursesGrid');
        
        if (!Array.isArray(courses) || courses.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: white; font-size: 1.2rem; grid-column: 1/-1;">No enrolled courses yet. <a href="#" onclick="showCourses()" style="color: #ffd700;">Browse courses</a></p>';
            return;
        }
        
        grid.innerHTML = courses.map(course => `
            <div class="course-card">
                <h3>${course.title}</h3>
                <p><i class="fas fa-check-circle" style="color: #27ae60;"></i> Enrolled</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('My courses load failed:', error);
    }
}

async function loadProfile() {
    try {
        const user = await apiCall('GET', `users/${currentUser}`, token);
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileEmail').textContent = user.email;
    } catch (error) {
        console.error('Profile load failed:', error);
        showMessage('Failed to load profile', 'error');
    }
}

function editProfile() {
    showMessage('Edit profile feature coming soon!', 'success');
}

async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    
    try {
        await apiCall('DELETE', `users/${currentUser}`, token);
        logout();
        showMessage('Account deleted successfully.', 'success');
    } catch (error) {
        console.error('Delete failed:', error);
        showMessage('Failed to delete account', 'error');
    }
}

function logout() {
    currentUser = null;
    token = null;
    localStorage.removeItem('token');
    showLogin();
}
