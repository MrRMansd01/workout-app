document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '';

    const profileButtons = document.querySelectorAll('.profile-btn');
    const daysOfWeek = document.querySelectorAll('.day-btn');
    const exerciseList = document.getElementById('exercise-list');
    const setsContainer = document.getElementById('sets-container');
    const currentExerciseTitle = document.getElementById('current-exercise-title');
    const uploadInput = document.getElementById('excel-upload');
    const reportBtn = document.getElementById('report-btn');
    const modal = document.getElementById('report-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const reportDataEl = document.getElementById('report-data');

    let currentDay = '';
    let currentPlan = [];
    let currentProfileId = 1;

    profileButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentProfileId = parseInt(button.dataset.profile);
            profileButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            setsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>برای شروع ثبت، حرکت را انتخاب کنید</p></div>';
            currentExerciseTitle.innerText = '⚡ یک حرکت را انتخاب کنید';
            document.querySelectorAll('#exercise-list .exercise-item').forEach(el => el.classList.remove('active'));
        });
    });

    daysOfWeek.forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            currentDay = dayEl.dataset.day;
            daysOfWeek.forEach(d => d.classList.remove('active'));
            dayEl.classList.add('active');
            document.getElementById('exercises-title').innerText = `🏋️ حرکات ${currentDay}`;
            fetchPlanForDay(currentDay);
        });
    });

    async function fetchPlanForDay(day) {
        exerciseList.innerHTML = '<div class="empty-state"><div class="loading"></div></div>';
        try {
            const response = await fetch(`${API_BASE_URL}/api/plan?day=${day}`);
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
            currentPlan = await response.json();
            renderPlan(currentPlan);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    function renderPlan(plan) {
        exerciseList.innerHTML = '';
        setsContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>برای شروع ثبت، حرکت را انتخاب کنید</p></div>';
        currentExerciseTitle.innerText = '⚡ یک حرکت را انتخاب کنید';
        if (plan.length === 0) {
            exerciseList.innerHTML = '<div class="empty-state"><div class="empty-icon">🤷‍♂️</div><p>برنامه‌ای برای این روز یافت نشد.</p></div>';
            return;
        }
        plan.forEach(item => {
            const li = document.createElement('li');
            li.className = 'exercise-item';
            li.innerHTML = `<div class="exercise-name">${item.exercise_name}</div><div class="exercise-sets">${item.sets_count} ست</div>`;
            li.addEventListener('click', () => {
                document.querySelectorAll('#exercise-list .exercise-item').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                renderSetInputs(item.exercise_name, item.sets_count);
            });
            exerciseList.appendChild(li);
        });
    }

    function renderSetInputs(exerciseName, setsCount) {
        currentExerciseTitle.innerText = `حرکت: ${exerciseName}`;
        setsContainer.innerHTML = '';
        for (let i = 1; i <= setsCount; i++) {
            const setRow = document.createElement('div');
            setRow.classList.add('set-row');
            setRow.innerHTML = `
                <label class="set-label">ست ${i}</label>
                <input type="number" placeholder="وزنه (kg)" class="set-input weight-input" />
                <input type="number" placeholder="تکرار" class="set-input reps-input" />
                <button class="save-btn" data-set-number="${i}">ذخیره</button>
            `;
            setsContainer.appendChild(setRow);
        }
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', saveSet);
        });
    }

    async function saveSet(event) {
        const btn = event.target;
        const setRow = btn.closest('.set-row');
        const weight = setRow.querySelector('.weight-input').value;
        const reps = setRow.querySelector('.reps-input').value;
        const setNumber = btn.dataset.setNumber;
        const exerciseName = currentExerciseTitle.innerText.replace('حرکت: ', '');
        
        if (!weight || !reps) {
            alert('لطفا مقادیر وزنه و تکرار را وارد کنید.');
            return;
        }

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
            if (!response.ok) throw new Error('خطا در ذخیره اطلاعات');
            btn.textContent = 'ذخیره شد';
            btn.disabled = true;
            btn.classList.add('saved');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

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
                alert('برنامه با موفقیت آپلود شد!');
                if(currentDay) fetchPlanForDay(currentDay);
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    reportBtn.addEventListener('click', async () => {
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
                    if (!exercises[log.exercise_name]) {
                        exercises[log.exercise_name] = [];
                    }
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
            reportDataEl.textContent = reportText;
            modal.style.display = 'block';
        } catch (error) {
            alert(error.message);
        }
    });
    
    closeModalBtn.onclick = () => { modal.style.display = 'none'; }
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
});
