// Global variables
const API_BASE_URL = '';
let currentDay = '';
let currentPlan = [];
let currentProfileId = 1;

// DOM elements
const elements = {
    profileButtons: document.querySelectorAll('.profile-btn'),
    dayButtons: document.querySelectorAll('.day-btn'),
    exerciseList: document.getElementById('exercise-list'),
    setsContainer: document.getElementById('sets-container'),
    currentExerciseTitle: document.getElementById('current-exercise-title'),
    uploadInput: document.getElementById('excel-upload'),
    reportBtn: document.getElementById('report-btn'),
    modal: document.getElementById('report-modal'),
    closeModalBtn: document.querySelector('.close-btn'),
    reportData: document.getElementById('report-data'),
    exercisesTitle: document.getElementById('exercises-title')
};

// Utility functions
function showToast(message, type = 'success') {
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function updateEmptyState(container, icon, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <p class="empty-text">${message}</p>
        </div>
    `;
}

function showLoading(container, message = 'در حال بارگذاری...') {
    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-icon">⏳</div>
            <p class="loading-text">${message}</p>
        </div>
    `;
}

// Profile management
function initProfileButtons() {
    elements.profileButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentProfileId = parseInt(button.dataset.profile);
            elements.profileButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            resetSetsPanel();
            showToast(`پروفایل ${currentProfileId} انتخاب شد`);

            if (currentDay) {
                fetchPlanForDay(currentDay);
            }
        });
    });
}

function resetSetsPanel() {
    updateEmptyState(elements.setsContainer, '📝', 'برای شروع ثبت، حرکت مورد نظر را انتخاب کنید');
    elements.currentExerciseTitle.textContent = '⚡ یک حرکت را انتخاب کنید';
    document.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('active'));
}

// Day management
function initDayButtons() {
    elements.dayButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentDay = button.dataset.day;
            elements.dayButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            elements.exercisesTitle.textContent = `🏋️ حرکات ${currentDay}`;
            
            fetchPlanForDay(currentDay);
        });
    });
}

// Plan management
async function fetchPlanForDay(day) {
    try {
        showLoading(elements.exerciseList);
        
        const response = await fetch(`${API_BASE_URL}/api/plan?day=${day}`);
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
        
        currentPlan = await response.json();
        renderPlan(currentPlan);
        
    } catch (error) {
        console.error(error);
        updateEmptyState(elements.exerciseList, '❌', 'خطا در بارگذاری برنامه');
        showToast('خطا در بارگذاری برنامه', 'error');
    }
}

function renderPlan(plan) {
    resetSetsPanel();
    
    if (plan.length === 0) {
        updateEmptyState(elements.exerciseList, '🤷‍♂️', 'برنامه‌ای برای این روز یافت نشد');
        return;
    }
    
    elements.exerciseList.innerHTML = '';
    
    plan.forEach(item => {
        const li = document.createElement('div');
        li.className = 'exercise-item';
        li.dataset.exerciseName = item.exercise_name;
        li.dataset.setsCount = item.sets_count;
        
        li.innerHTML = `
            <div class="exercise-name">${item.exercise_name}</div>
            <div class="exercise-sets">${item.sets_count} ست</div>
        `;
        
        li.addEventListener('click', () => selectExercise(li, item));
        
        elements.exerciseList.appendChild(li);
    });
}

function selectExercise(element, item) {
    document.querySelectorAll('.exercise-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    renderSetInputs(item.exercise_name, item.sets_count);
}

// Sets management
function renderSetInputs(exerciseName, setsCount) {
    elements.currentExerciseTitle.textContent = `🏋️ ${exerciseName}`;
    elements.setsContainer.innerHTML = '';
    
    for (let i = 1; i <= setsCount; i++) {
        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <div class="set-label">ست ${i}</div>
            <input type="number" placeholder="وزنه (kg)" class="set-input weight-input" min="0" step="0.5">
            <input type="number" placeholder="تکرار" class="set-input reps-input" min="1" step="1">
            <button class="save-btn" data-set-number="${i}">ذخیره</button>
        `;
        
        setRow.querySelector('.save-btn').addEventListener('click', saveSet);
        elements.setsContainer.appendChild(setRow);
    }
}

async function saveSet(event) {
    const btn = event.target;
    const setRow = btn.closest('.set-row');
    const weightInput = setRow.querySelector('.weight-input');
    const repsInput = setRow.querySelector('.reps-input');
    
    if (!weightInput.value || !repsInput.value) {
        showToast('لطفا مقادیر وزنه و تکرار را وارد کنید', 'error');
        return;
    }

    btn.textContent = '...';
    btn.disabled = true;

    const logData = {
        log_date: new Date().toISOString().split('T')[0],
        exercise_name: elements.currentExerciseTitle.textContent.replace('🏋️ ', ''),
        set_number: parseInt(btn.dataset.setNumber),
        weight: parseFloat(weightInput.value),
        reps: parseInt(repsInput.value),
        profileId: currentProfileId
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/log-set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        
        if (!response.ok) throw new Error('خطا در ذخیره اطلاعات');
        
        btn.textContent = 'ذخیره شد';
        btn.classList.add('saved');
        showToast(`ست ${btn.dataset.setNumber} با موفقیت ثبت شد!`);
        
    } catch (error) {
        console.error(error);
        btn.textContent = 'خطا';
        btn.disabled = false;
        showToast(error.message, 'error');
    }
}


// File upload management
function initFileUpload() {
    elements.uploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        showToast('در حال پردازش فایل اکسل...');
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const planData = [];
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                json.forEach(row => {
                    planData.push({
                        day_name: sheetName,
                        exercise_name: row['حرکت'],
                        sets_count: row['تعداد ست']
                    });
                });
            });

            try {
                const response = await fetch(`${API_BASE_URL}/api/upload-plan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planData })
                });
                if (!response.ok) throw new Error('خطا در آپلود فایل');
                showToast(`برنامه با موفقیت آپلود شد!`, 'success');
                if(currentDay) fetchPlanForDay(currentDay);
            } catch (error) {
                console.error(error);
                showToast(error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Report management
function initReportButton() {
    elements.reportBtn.addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const response = await fetch(`${API_BASE_URL}/api/report?date=${today}&profileId=${currentProfileId}`);
            if (!response.ok) throw new Error('خطا در دریافت گزارش');
            const report = await response.json();
            
            let reportText = `تاریخ: ${today}\nپروفایل: ${currentProfileId}\n\n`;
            if (report.length === 0) {
                reportText += "امروز هیچ حرکتی ثبت نشده است.";
            } else {
                const exercises = {};
                report.forEach(log => {
                    if (!exercises[log.exercise_name]) exercises[log.exercise_name] = [];
                    exercises[log.exercise_name].push(log);
                });
                for (const exName in exercises) {
                    reportText += `--- ${exName} ---\n`;
                    exercises[exName].forEach(log => {
                        reportText += `ست ${log.set_number}: ${log.weight} کیلوگرم × ${log.reps} تکرار\n`;
                    });
                    reportText += '\n';
                }
            }
            elements.reportData.textContent = reportText;
            elements.modal.style.display = 'flex';
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Modal management
function initModal() {
    elements.closeModalBtn.addEventListener('click', () => {
        elements.modal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == elements.modal) {
            elements.modal.style.display = 'none';
        }
    });
}

// Auto-select today's day
function selectTodayByDefault() {
    const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const todayName = dayNames[new Date().getDay()];
    const todayButton = document.querySelector(`.day-btn[data-day="${todayName}"]`);
    if (todayButton) {
        todayButton.click();
    }
}

// Initialize application
function initApp() {
    initProfileButtons();
    initDayButtons();
    initFileUpload();
    initReportButton();
    initModal();
    selectTodayByDefault();
    console.log('Workout Tracker initialized successfully');
}

document.addEventListener('DOMContentLoaded', initApp);
