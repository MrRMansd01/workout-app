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
    controlsTitle: document.getElementById('controls-title'),
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
        <div class="empty-state">
            <div class="loading"></div>
            <p class="empty-text" style="margin-top: 16px;">${message}</p>
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

            // Refresh plan for the new profile if a day is selected
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
        const li = document.createElement('li');
        li.className = 'exercise-item';
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.dataset.exerciseName = item.exercise_name;
        li.dataset.setsCount = item.sets_count;
        
        li.innerHTML = `
            <div class="exercise-name">${item.exercise_name}</div>
            <div class="exercise-sets">${item.sets_count} ست</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
        `;
        
        li.addEventListener('click', () => selectExercise(li, item));
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectExercise(li, item);
            }
        });
        
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
            <input type="number" placeholder="وزنه (kg)" class="set-input weight-input" min="0" step="0.5" aria-label="وزنه ست ${i}">
            <input type="number" placeholder="تکرار" class="set-input reps-input" min="1" step="1" aria-label="تکرار ست ${i}">
            <button class="save-btn" data-set-number="${i}" type="button" aria-label="ذخیره ست ${i}">ذخیره</button>
        `;
        
        const saveBtn = setRow.querySelector('.save-btn');
        const repsInput = setRow.querySelector('.reps-input');
        
        saveBtn.addEventListener('click', saveSet);
        
        repsInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!saveBtn.disabled) saveBtn.click();
            }
        });
        
        elements.setsContainer.appendChild(setRow);
    }
}

async function saveSet(event) {
    const btn = event.target;
    const setRow = btn.closest('.set-row');
    const weightInput = setRow.querySelector('.weight-input');
    const repsInput = setRow.querySelector('.reps-input');
    const weight = weightInput.value.trim();
    const reps = repsInput.value.trim();
    const setNumber = btn.dataset.setNumber;
    const exerciseName = elements.currentExerciseTitle.textContent.replace('🏋️ ', '');
    
    if (!weight || !reps || parseFloat(weight) <= 0 || parseInt(reps) <= 0) {
        showToast('لطفا مقادیر معتبر وزنه و تکرار را وارد کنید', 'error');
        return;
    }

    btn.innerHTML = '<span class="loading"></span>';
    btn.disabled = true;
    weightInput.disabled = true;
    repsInput.disabled = true;

    const logData = {
        log_date: new Date().toISOString().split('T')[0],
        exercise_name: exerciseName,
        set_number: parseInt(setNumber),
        weight: parseFloat(weight),
        reps: parseInt(reps),
        profileId: currentProfileId
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/log-set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'خطا در ارتباط با سرور');
        }
        
        btn.textContent = '✅ ذخیره شد';
        btn.classList.add('saved');
        showToast(`ست ${setNumber} با موفقیت ثبت شد!`);
        updateProgress(exerciseName);
        
        if (navigator.vibrate) navigator.vibrate(50);
        
    } catch (error) {
        console.error(error);
        btn.textContent = 'تلاش مجدد';
        btn.disabled = false;
        weightInput.disabled = false;
        repsInput.disabled = false;
        showToast(error.message, 'error');
    }
}

function updateProgress(exerciseName) {
    const exerciseItem = document.querySelector(`.exercise-item[data-exercise-name="${exerciseName}"]`);
    if (!exerciseItem) return;
    
    const totalSets = parseInt(exerciseItem.dataset.setsCount);
    const setsForThisExercise = document.querySelectorAll(`.set-row`).length;
    let completedSets = 0;
    
    const currentExerciseRows = elements.setsContainer.querySelectorAll('.set-row');
    currentExerciseRows.forEach(row => {
        if(row.querySelector('.save-btn.saved')) {
            completedSets++;
        }
    });

    const progressPercent = Math.min((completedSets / totalSets) * 100, 100);
    
    const progressFill = exerciseItem.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = progressPercent + '%';
    }
    
    if (completedSets === totalSets) {
        showToast(`🎉 تمام ست‌های ${exerciseName} تکمیل شد!`);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
}

// File upload management
function initFileUpload() {
    elements.uploadInput.addEventListener('change', handleFileUpload);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
        showToast('لطفا فایل اکسل معتبر انتخاب کنید', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            showToast('در حال پردازش فایل...');
            
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const planData = [];
            
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                
                json.forEach(row => {
                    const exerciseName = row['حرکت'] || row['exercise'];
                    const setsCount = row['تعداد ست'] || row['sets'];
                    
                    if (exerciseName && setsCount && !isNaN(setsCount)) {
                        planData.push({
                            day_name: sheetName,
                            exercise_name: String(exerciseName).trim(),
                            sets_count: parseInt(setsCount)
                        });
                    }
                });
            });

            if (planData.length === 0) throw new Error('فایل اکسل معتبر نیست یا خالی است');

            const response = await fetch(`${API_BASE_URL}/api/upload-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planData })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'خطا در آپلود فایل');
            }
            
            showToast(`برنامه با موفقیت آپلود شد! 🎉`);
            
            if (currentDay) {
                await fetchPlanForDay(currentDay);
            }
            
        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        } finally {
            event.target.value = '';
        }
    };

    reader.onerror = () => {
        showToast('خطا در خواندن فایل', 'error');
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}

// Report management
function initReportButton() {
    elements.reportBtn.addEventListener('click', generateReport);
}

async function generateReport() {
    const today = new Date().toISOString().split('T')[0];
    const todayFormatted = new Date().toLocaleDateString('fa-IR');
    
    try {
        elements.reportBtn.innerHTML = '<span class="loading"></span> در حال تهیه گزارش...';
        elements.reportBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/api/report?date=${today}&profileId=${currentProfileId}`);
        if(!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'خطا در دریافت گزارش');
        }
        const reportLogs = await response.json();
        
        let reportText = `📊 گزارش تاریخ: ${todayFormatted}\n👤 پروفایل: ${currentProfileId}\n${'='.repeat(50)}\n\n`;
        
        if (reportLogs.length === 0) {
            reportText += "🤷‍♂️ امروز هیچ حرکتی ثبت نشده است.";
        } else {
            const exercises = {};
            let totalVolume = 0;
            
            reportLogs.forEach(log => {
                if (!exercises[log.exercise_name]) {
                    exercises[log.exercise_name] = [];
                }
                exercises[log.exercise_name].push(log);
                totalVolume += log.weight * log.reps;
            });
            
            for (const exName in exercises) {
                reportText += `🏋️ ${exName}\n${'-'.repeat(30)}\n`;
                let exerciseVolume = 0;
                
                exercises[exName].forEach(log => {
                    const volume = log.weight * log.reps;
                    exerciseVolume += volume;
                    reportText += `   ست ${log.set_number}: ${log.weight} کیلوگرم × ${log.reps} تکرار = ${volume.toFixed(1)} کیلوگرم حجم\n`;
                });
                
                reportText += `   💪 حجم کل: ${exerciseVolume.toFixed(1)} کیلوگرم\n\n`;
            }
            
            reportText += `📈 حجم کل تمرین: ${totalVolume.toFixed(1)} کیلوگرم\n`;
            reportText += `🏆 تعداد ست‌های تکمیل شده: ${reportLogs.length}\n`;
        }
        
        elements.reportData.textContent = reportText;
        elements.modal.style.display = 'block';
        
    } catch (error) {
        console.error(error);
        showToast(error.message, 'error');
    } finally {
        elements.reportBtn.textContent = '📈 گزارش امروز';
        elements.reportBtn.disabled = false;
    }
}

// Modal management
function initModal() {
    elements.closeModalBtn.addEventListener('click', closeModal);
    
    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) closeModal();
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && elements.modal.style.display === 'block') closeModal();
    });
}

function closeModal() {
    elements.modal.style.display = 'none';
}

// Auto-select today's day
function selectTodayByDefault() {
    const today = new Date();
    const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const todayName = dayNames[today.getDay()];
    
    const todayButton = document.querySelector(`.day-btn[data-day="${todayName}"]`);
    if (todayButton) {
        setTimeout(() => todayButton.click(), 300);
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
    
    console.log('✅ Workout Tracker initialized successfully');
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
