const R2_BASE_URL = "https://pub-50bb0a7170f24a0fb33dc91b892ffecc.r2.dev/";
const JSON_URL = "https://lib.psychicalbeacon.com/books_db.json";

let allBooks = [];
let displayedBooks = [];
let itemsToShow = 40;
let currentPath = [];
let folderStructure = {};

const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const statsCounter = document.getElementById('statsCounter');
const breadcrumb = document.getElementById('breadcrumb');
const categoryTitle = document.getElementById('categoryTitle');

// Sort alphabetically
function sortByAlphabet(books) {
    return books.sort((a, b) => {
        const titleA = a.t || '';
        const titleB = b.t || '';
        return titleA.localeCompare(titleB, 'en', { numeric: true });
    });
}

// Build hierarchical folder structure
function buildFolderStructure(books) {
    folderStructure = {
        items: [],
        folders: {}
    };

    books.forEach(book => {
        const pathParts = book.f.split('/').filter(p => p.trim());

        if (pathParts.length === 0) {
            folderStructure.items.push(book);
            return;
        }

        let current = folderStructure;
        pathParts.forEach((part, index) => {
            if (!current.folders[part]) {
                current.folders[part] = {
                    name: part,
                    items: [],
                    folders: {}
                };
            }

            if (index === pathParts.length - 1) {
                current.folders[part].items.push(book);
            }

            current = current.folders[part];
        });
    });

    sortFolderStructure(folderStructure);
}

function sortFolderStructure(folder) {
    folder.items = sortByAlphabet(folder.items);
    Object.values(folder.folders).forEach(subfolder => {
        sortFolderStructure(subfolder);
    });
}

// Calculate total book count including subfolders
function getTotalBookCount(folder) {
    let count = folder.items.length;
    Object.values(folder.folders).forEach(subfolder => {
        count += getTotalBookCount(subfolder);
    });
    return count;
}

// Get subfolder count
function getSubfolderCount(folder) {
    return Object.keys(folder.folders).length;
}

// Get current folder
function getCurrentFolder() {
    let current = folderStructure;
    for (let pathPart of currentPath) {
        if (current.folders[pathPart]) {
            current = current.folders[pathPart];
        } else {
            return folderStructure;
        }
    }
    return current;
}

// Render current folder contents
function renderCurrentFolder() {
    const currentFolder = getCurrentFolder();
    displayedBooks = [];

    // Add subfolders with total book count
    const folderNames = Object.keys(currentFolder.folders)
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

    folderNames.forEach(folderName => {
        const folder = currentFolder.folders[folderName];
        const totalBooks = getTotalBookCount(folder);
        displayedBooks.push({
            t: folderName,
            f: 'Folder',
            s: `${totalBooks} book${totalBooks !== 1 ? 's' : ''}`,
            directBooks: folder.items.length,
            isFolder: true,
            folderName: folderName
        });
    });

    // Add books in current folder
    displayedBooks = displayedBooks.concat(sortByAlphabet([...currentFolder.items]));

    updateBreadcrumb();
    updateCategoryTitle();
    updateCounter();
    booksGrid.innerHTML = '';
    renderBooks();
}

// Update breadcrumb navigation
function updateBreadcrumb() {
    breadcrumb.innerHTML = '';

    const homeBtn = document.createElement('span');
    homeBtn.className = 'breadcrumb-item' + (currentPath.length === 0 ? ' active' : '');
    homeBtn.innerHTML = `
        <svg class="breadcrumb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <path d="M8 7h8M8 11h8M8 15h5"></path>
        </svg>
        Home
    `;
    homeBtn.style.cursor = 'pointer';

    homeBtn.addEventListener('click', () => {
        currentPath = [];
        window.history.pushState({ path: [] }, '', window.location.pathname);
        renderCurrentFolder();
    });

    breadcrumb.appendChild(homeBtn);

    currentPath.forEach((pathPart, index) => {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = ' / ';
        breadcrumb.appendChild(separator);

        const btn = document.createElement('span');
        btn.className = 'breadcrumb-item' + (index === currentPath.length - 1 ? ' active' : '');
        btn.textContent = pathPart;
        btn.style.cursor = 'pointer';

        btn.addEventListener('click', () => {
            currentPath = currentPath.slice(0, index + 1);
            window.history.pushState({ path: [...currentPath] }, '', `?path=${encodeURIComponent(currentPath.join('/'))}`);
            renderCurrentFolder();
        });

        breadcrumb.appendChild(btn);
    });
}

// Update category title
function updateCategoryTitle() {
    if (currentPath.length === 0) {
        categoryTitle.style.display = 'none';
    } else {
        categoryTitle.style.display = 'block';
        document.getElementById('categoryName').textContent = currentPath[currentPath.length - 1];
        const currentFolder = getCurrentFolder();
        const totalBooks = getTotalBookCount(currentFolder);
        const directBooks = currentFolder.items.length;
        const subfolders = getSubfolderCount(currentFolder);
        document.getElementById('categoryCount').textContent = `${totalBooks} book${totalBooks !== 1 ? 's' : ''} (${directBooks} direct, ${subfolders} subfolder${subfolders !== 1 ? 's' : ''})`;
    }
}

// Render books and folders
function renderBooks(append = false) {
    if (!append) booksGrid.innerHTML = '';

    const currentCount = append ? booksGrid.children.length : 0;
    const nextBatch = displayedBooks.slice(currentCount, currentCount + itemsToShow);

    if (nextBatch.length === 0 && !append) {
        booksGrid.innerHTML = '<div class="no-results">No items found.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    nextBatch.forEach(item => {
        const card = document.createElement('div');
        card.className = 'book-card';

        if (item.isFolder) {
            card.innerHTML = `
                    <div class="book-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z"/></svg>
                    </div>
                    <h3 class="book-title">${item.t}</h3>
                    <div class="book-meta"><span class="book-size">${item.s}</span></div>
                `;

            const btn = document.createElement('button');
            btn.className = 'download-btn';
            btn.textContent = 'Open Folder';

            btn.addEventListener('click', () => {
                currentPath.push(item.folderName);
                window.history.pushState({ path: [...currentPath] }, '', `?path=${encodeURIComponent(currentPath.join('/'))}`);
                renderCurrentFolder();
            });

            card.appendChild(btn);
        } else {
            let path = item.p;
            if (path && path.includes('file:///')) {
                path = path.split('/').pop();
            }

            card.innerHTML = `
                    <div class="book-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 18H6a1 1 0 0 0 0 2h15v2H6a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2h16v16zM5 16.05c.16-.03.33-.05.5-.05H19V4H5v12.05zM16 9H8V7h8v2zm0 4H8v-2h8v2z"/></svg>
                    </div>
                    <h3 class="book-title">${item.t}</h3>
                    <div class="book-meta"><span class="book-size">${item.s}</span></div>
                    <a class="download-btn" href="${R2_BASE_URL + (path || '')}" download target="_blank">Download Book</a>
                `;
        }
        fragment.appendChild(card);
    });
    booksGrid.appendChild(fragment);
}

// Initialize
async function init() {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error('Failed to load');
        allBooks = await response.json();

        buildFolderStructure(allBooks);

        const params = new URLSearchParams(window.location.search);
        const pathFromUrl = params.get('path');
        if (pathFromUrl) {
            currentPath = pathFromUrl.split('/').filter(p => p.trim());
        }

        renderCurrentFolder();
        setupInfiniteScroll();
    } catch (error) {
        booksGrid.innerHTML = `<div class="no-results">❌ Failed to load library: ${error.message}</div>`;
    }
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();

    if (query === "") {
        renderCurrentFolder();
        return;
    }

    displayedBooks = allBooks.filter(book =>
        book.t.toLowerCase().includes(query) ||
        book.f.toLowerCase().includes(query)
    );

    statsCounter.innerText = `Found: ${displayedBooks.length} book${displayedBooks.length !== 1 ? 's' : ''}`;
    categoryTitle.style.display = 'none';
    renderBooks(false);
});

// Update counter
function updateCounter() {
    if (searchInput.value === "") {
        const currentFolder = getCurrentFolder();
        const directBooks = currentFolder.items.length;
        const subfolders = getSubfolderCount(currentFolder);
        const totalBooks = getTotalBookCount(currentFolder);

        if (currentPath.length === 0) {
            // Count ALL folders recursively, not just top-level
            function countAllFolders(folder) {
                let count = getSubfolderCount(folder);
                Object.values(folder.folders).forEach(subfolder => {
                    count += countAllFolders(subfolder);
                });
                return count;
            }

            const allFolders = countAllFolders(folderStructure);
            statsCounter.innerText = `Smart Book Counter: ${getTotalBookCount(folderStructure).toLocaleString()} books | ${allFolders} folders`;
        } else {
            statsCounter.innerText = `Smart Book Counter: ${totalBooks.toLocaleString()} books (${directBooks} direct | ${subfolders} subfolder${subfolders !== 1 ? 's' : ''})`;
        }
    }
}

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && booksGrid.children.length < displayedBooks.length) {
            renderBooks(true);
        }
    }, { rootMargin: '200px' });
    observer.observe(document.getElementById('loadMoreTrigger'));
}

// Handle browser back button
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.path) {
        currentPath = event.state.path;
    } else {
        currentPath = [];
    }
    renderCurrentFolder();
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert("Copied successfully!"));
}

document.addEventListener('DOMContentLoaded', function () {
    const copySolBtn = document.getElementById('copySolBtn');
    const copyBtcBtn = document.getElementById('copyBtcBtn');

    if (copySolBtn) {
        copySolBtn.addEventListener('click', function (e) {
            e.preventDefault();
            copyToClipboard('SamJzu73QqdE2Htv7mmn9MUDALypWRoR2H51qon5R9F');
        });
    }

    if (copyBtcBtn) {
        copyBtcBtn.addEventListener('click', function (e) {
            e.preventDefault();
            copyToClipboard('1SamUEdkg5qkNPojCuvepTUMjSvp4WiUN');
        });
    }
});

init();

// ==================== نظام تتبع الزوار الحقيقيين ====================
let currentVisitorCount = 0;
let realVisitorCount = 0;
const visitorCountElement = document.getElementById('visitorCount');
const HEARTBEAT_INTERVAL = 3000; // 3 ثوانٍ
const VISITOR_TIMEOUT = 10000; // 10 ثوانٍ (يعتبر الزائر غير نشط بعدها)

// معرف فريد للزائر الحالي
const sessionId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// نظام تتبع محلي بسيط (يعمل عبر localStorage مشترك)
class VisitorTracker {
    constructor() {
        this.storageKey = 'active_visitors';
        this.init();
    }

    init() {
        // تنظيف الزوار القدامى عند البدء
        this.cleanupOldVisitors();

        // إضافة الزائر الحالي
        this.addCurrentVisitor();

        // إرسال heartbeat دوري
        setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL);

        // تحديث العداد دوريًا
        setInterval(() => this.updateCount(), 1000);

        // حذف الزائر عند إغلاق الصفحة
        window.addEventListener('beforeunload', () => this.removeCurrentVisitor());

        // الاستماع للتغييرات من tabs أخرى
        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.updateCount();
            }
        });
    }

    getVisitors() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    saveVisitors(visitors) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(visitors));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    cleanupOldVisitors() {
        const visitors = this.getVisitors();
        const now = Date.now();
        let hasChanges = false;

        Object.keys(visitors).forEach(id => {
            if (now - visitors[id].lastSeen > VISITOR_TIMEOUT) {
                delete visitors[id];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveVisitors(visitors);
        }
    }

    addCurrentVisitor() {
        const visitors = this.getVisitors();
        visitors[sessionId] = {
            lastSeen: Date.now(),
            joined: Date.now()
        };
        this.saveVisitors(visitors);
        this.updateCount();
    }

    sendHeartbeat() {
        const visitors = this.getVisitors();
        if (visitors[sessionId]) {
            visitors[sessionId].lastSeen = Date.now();
            this.saveVisitors(visitors);
        }
        this.cleanupOldVisitors();
    }

    removeCurrentVisitor() {
        const visitors = this.getVisitors();
        delete visitors[sessionId];
        this.saveVisitors(visitors);
    }

    getActiveCount() {
        this.cleanupOldVisitors();
        const visitors = this.getVisitors();
        return Object.keys(visitors).length;
    }

    updateCount() {
        realVisitorCount = this.getActiveCount();
        // ضرب في 3 كما طلب المستخدم
        currentVisitorCount = realVisitorCount * 3;
        this.displayCount();
    }

    displayCount() {
        if (visitorCountElement) {
            const oldCount = parseInt(visitorCountElement.textContent.replace(/,/g, '')) || 0;

            if (oldCount !== currentVisitorCount) {
                // تأثير بصري عند التغيير
                visitorCountElement.style.transform = 'scale(1.1)';
                visitorCountElement.style.color = '#00ff88';

                setTimeout(() => {
                    visitorCountElement.textContent = currentVisitorCount.toLocaleString();
                    visitorCountElement.style.transform = 'scale(1)';
                    visitorCountElement.style.color = '#00ff00';
                }, 150);
            } else if (visitorCountElement.textContent === '---') {
                visitorCountElement.textContent = currentVisitorCount.toLocaleString();
            }
        }
    }
}

// تهيئة نظام التتبع
const tracker = new VisitorTracker();

// لوحة تحكم للمطورين (يمكن حذفها لاحقًا)
console.log('🔍 Visitor Tracker Initialized');
console.log('Session ID:', sessionId);
console.log('Check real count: localStorage.getItem("active_visitors")');
