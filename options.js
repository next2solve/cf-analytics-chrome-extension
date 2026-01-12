'use strict';

const API_BASE = 'https://codeforces.com/api';
const PROFILE_INFO_REQUEST = `${API_BASE}/user.info?handles=`;
const SUBMISSION_INFO_REQUEST = `${API_BASE}/user.status?handle=`;

// Codeforces Rank Colors
const RANK_COLORS = {
    'newbie': {
        primary: '#808080',
        secondary: '#999999',
        gradient: 'linear-gradient(135deg, #808080 0%, #999999 100%)'
    },
    'pupil': {
        primary: '#008000',
        secondary: '#00a000',
        gradient: 'linear-gradient(135deg, #008000 0%, #00a000 100%)'
    },
    'specialist': {
        primary: '#03a89e',
        secondary: '#00c9be',
        gradient: 'linear-gradient(135deg, #03a89e 0%, #00c9be 100%)'
    },
    'expert': {
        primary: '#0000ff',
        secondary: '#4444ff',
        gradient: 'linear-gradient(135deg, #0000ff 0%, #4444ff 100%)'
    },
    'candidate master': {
        primary: '#a000a0',
        secondary: '#c040c0',
        gradient: 'linear-gradient(135deg, #a000a0 0%, #c040c0 100%)'
    },
    'master': {
        primary: '#ff8c00',
        secondary: '#ffaa00',
        gradient: 'linear-gradient(135deg, #ff8c00 0%, #ffaa00 100%)'
    },
    'international master': {
        primary: '#ff8c00',
        secondary: '#ffaa00',
        gradient: 'linear-gradient(135deg, #ff8c00 0%, #ffaa00 100%)'
    },
    'grandmaster': {
        primary: '#ff0000',
        secondary: '#ff4444',
        gradient: 'linear-gradient(135deg, #ff0000 0%, #ff4444 100%)'
    },
    'international grandmaster': {
        primary: '#ff0000',
        secondary: '#ff4444',
        gradient: 'linear-gradient(135deg, #ff0000 0%, #ff4444 100%)'
    },
    'legendary grandmaster': {
        primary: '#ff0000',
        secondary: '#ff4444',
        gradient: 'linear-gradient(135deg, #ff0000 0%, #ff4444 100%)'
    },
    'default': {
        primary: '#667eea',
        secondary: '#764ba2',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
};

// DOM Elements
const searchForm = document.getElementById('searchForm');
const handleInput = document.getElementById('handleEntry');
const submitButton = document.getElementById('handleSubmit');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileDiv = document.getElementById('profileDiv');

// Utility Functions
function showLoading() {
    loadingState.style.display = 'block';
    errorState.style.display = 'none';
    profileDiv.style.display = 'none';
    submitButton.disabled = true;
}

function hideLoading() {
    loadingState.style.display = 'none';
    submitButton.disabled = false;
}

function showError(message) {
    hideLoading();
    errorState.style.display = 'block';
    errorState.querySelector('.error-message').textContent = message;
    profileDiv.style.display = 'none';
}

function showProfile() {
    hideLoading();
    errorState.style.display = 'none';
    profileDiv.style.display = 'block';
}

function clearNode(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
}

// This function is no longer needed as colors are applied directly during render

// Event Handlers
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const handle = handleInput.value.trim();

    if (!handle) {
        showError('Please enter a Codeforces handle');
        return;
    }

    clearNode(profileDiv);
    showLoading();

    try {
        await loadProfile(handle);
    } catch (error) {
        showError(error.message || 'Failed to load profile. Please try again.');
    }
});

// API Functions
async function fetchUserInfo(handle) {
    const response = await fetch(PROFILE_INFO_REQUEST + handle);
    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error('User not found. Please check the handle and try again.');
    }

    return data.result[0];
}

async function fetchSubmissions(handle) {
    const response = await fetch(SUBMISSION_INFO_REQUEST + handle);
    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error('Failed to fetch submissions');
    }

    return data.result;
}

// Main Profile Loading Function
async function loadProfile(handle) {
    try {
        // Fetch user info and submissions in parallel
        const [userInfo, submissions] = await Promise.all([
            fetchUserInfo(handle),
            fetchSubmissions(handle)
        ]);

        // Process submissions data
        const stats = processSubmissions(submissions);

        // Render profile
        renderProfile(userInfo, stats);
        showProfile();
    } catch (error) {
        showError(error.message);
    }
}

// Process Submissions
function processSubmissions(submissions) {
    const uniqueSolves = new Set();
    const verdictMap = new Map();
    const categoryMap = new Map();

    submissions.forEach(submission => {
        // Count verdicts
        const verdict = submission.verdict;
        verdictMap.set(verdict, (verdictMap.get(verdict) || 0) + 1);

        // Count unique AC problems and categories
        if (verdict === 'OK') {
            const problemKey = `${submission.problem.contestId}-${submission.problem.index}`;
            if (!uniqueSolves.has(problemKey)) {
                uniqueSolves.add(problemKey);

                // Count categories for unique solves only
                if (submission.problem.tags) {
                    submission.problem.tags.forEach(tag => {
                        categoryMap.set(tag, (categoryMap.get(tag) || 0) + 1);
                    });
                }
            }
        }
    });

    return {
        uniqueSolves: uniqueSolves.size,
        verdicts: Array.from(verdictMap.entries()).sort((a, b) => b[1] - a[1]),
        categories: Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]),
        totalSubmissions: submissions.length
    };
}

// Render Profile
function renderProfile(userInfo, stats) {
    clearNode(profileDiv);

    // Get rank colors
    const rankLower = userInfo.rank ? userInfo.rank.toLowerCase() : '';
    const colors = RANK_COLORS[rankLower] || RANK_COLORS['default'];

    // Profile Header
    const header = createElement('div', 'profile-header');

    // Profile Photo - FIX: Ensure HTTPS protocol
    if (userInfo.titlePhoto) {
        const photo = document.createElement('img');
        photo.className = 'profile-photo';
        // Fix: Remove protocol and add https explicitly
        const photoUrl = userInfo.titlePhoto.replace(/^(https?:)?\/\//, 'https://');
        photo.src = photoUrl;
        photo.alt = userInfo.handle;
        // Set border color based on rank
        photo.style.borderColor = colors.primary;
        photo.onerror = function() {
            // Fallback if image fails to load
            this.style.display = 'none';
        };
        header.appendChild(photo);
    }

    // Handle
    const handleDiv = createElement('div', 'profile-handle', userInfo.handle);
    header.appendChild(handleDiv);

    // Rating badges
    const badgesDiv = createElement('div', 'badges-container');

    if (userInfo.rating) {
        const ratingBadge = createElement('span', 'rating-badge rating-current', `Rating: ${userInfo.rating}`);
        badgesDiv.appendChild(ratingBadge);
    }

    if (userInfo.maxRating) {
        const maxRatingBadge = createElement('span', 'rating-badge rating-max', `Max: ${userInfo.maxRating}`);
        badgesDiv.appendChild(maxRatingBadge);
    }

    if (userInfo.rank) {
        const rankBadge = createElement('span', 'rating-badge rank-badge', userInfo.rank);
        badgesDiv.appendChild(rankBadge);
    }

    if (userInfo.maxRank && userInfo.maxRank !== userInfo.rank) {
        const maxRankBadge = createElement('span', 'rating-badge rank-badge', `Max: ${userInfo.maxRank}`);
        maxRankBadge.style.opacity = '0.8';
        badgesDiv.appendChild(maxRankBadge);
    }

    header.appendChild(badgesDiv);
    profileDiv.appendChild(header);

    // Stats Grid
    const statsGrid = createElement('div', 'stats-grid');

    const uniqueSolvesCard = createStatCard(stats.uniqueSolves, 'Unique Solves');
    const totalSubsCard = createStatCard(stats.totalSubmissions, 'Total Submissions');
    const categoriesCard = createStatCard(stats.categories.length, 'Categories');

    statsGrid.appendChild(uniqueSolvesCard);
    statsGrid.appendChild(totalSubsCard);
    statsGrid.appendChild(categoriesCard);
    profileDiv.appendChild(statsGrid);

    // Verdict Table
    if (stats.verdicts.length > 0) {
        const verdictTitle = createElement('div', 'section-title', 'Submission Verdicts');
        profileDiv.appendChild(verdictTitle);

        const verdictTable = createTable(stats.verdicts, 'Verdict', 'Count', colors.gradient);
        profileDiv.appendChild(verdictTable);
    }

    // Category Table
    if (stats.categories.length > 0) {
        const categoryTitle = createElement('div', 'section-title', 'Problem Categories');
        profileDiv.appendChild(categoryTitle);

        const categoryTable = createTable(stats.categories, 'Category', 'Solves', colors.gradient);
        profileDiv.appendChild(categoryTable);
    }
}

// Helper: Create Stat Card
function createStatCard(value, label) {
    const card = createElement('div', 'stat-card');
    const valueDiv = createElement('div', 'stat-value', value);
    const labelDiv = createElement('div', 'stat-label', label);
    card.appendChild(valueDiv);
    card.appendChild(labelDiv);
    return card;
}

// Helper: Create Table
function createTable(data, keyHeader, valueHeader, headerColor) {
    const table = document.createElement('table');

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.textContent = keyHeader;
    if (headerColor) th1.style.background = headerColor;
    const th2 = document.createElement('th');
    th2.textContent = valueHeader;
    th2.style.textAlign = 'right';
    if (headerColor) th2.style.background = headerColor;
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    data.forEach(([key, value]) => {
        const row = document.createElement('tr');
        const cell1 = document.createElement('td');
        cell1.className = 'table-key';
        cell1.textContent = key;
        const cell2 = document.createElement('td');
        cell2.className = 'table-value';
        cell2.textContent = value;
        row.appendChild(cell1);
        row.appendChild(cell2);
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    return table;
}
