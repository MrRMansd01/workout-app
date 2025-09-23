document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '';

    // انتخابگرهای جدید
    const profileButtons = document.querySelectorAll('.profile-btn');

    const daysOfWeek = document.querySelectorAll('.day');
    const exerciseList = document.getElementById('exercises');
    const setsContainer = document.getElementById('sets-container');
    const currentExerciseTitle = document.getElementById('current-exercise-title');
    const uploadInput = document.getElementById('excel-upload');
    const reportBtn = document.getElementById('report-btn');
    const modal = document.getElementById('report-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const reportDataEl = document.getElementById('report-data');

    // متغیرهای وضعیت
    let currentDay = '';
    let currentPlan = [];
    let currentProfileId = 1; // پروفایل پیش‌فرض

    // رویداد کلیک روی دکمه‌های پروفایل
    profileButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentProfileId = parseInt(button.dataset.profile);
            profileButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (currentDay) {
                fetchPlanForDay(currentDay);
            }
        });
    });

    // رویداد کلیک روی روزهای هفته
    daysOfWeek.forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            currentDay = dayEl.dataset.day;
            daysOfWeek.forEach(d => d.classList.remove('active'));
            dayEl.classList.add('active');
            document.getElementById('today-program-title').innerText = `برنامه روز: ${currentDay}`;
            fetchPlanForDay(currentDay);
        });
    });

// گرفتن برنامه روز از بک‌اند (با profileId)
    async function fetchPlanForDay(day) {
        try {
            // این خط را با دقت کپی و جایگزین کنید
            const response = await fetch(`${API_BASE_URL}/api/plan?day=${day}&profileId=${currentProfileId}`);
            
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
            currentPlan = await response.json();
            renderPlan(currentPlan);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // نمایش لیست حرکات
    function renderPlan(plan) {
        exerciseList.innerHTML = '';
        setsContainer.innerHTML = '';
        currentExerciseTitle.innerText = 'یک حرکت را انتخاب کنید';
        if (plan.length === 0) {
            const profileText = currentProfileId === 1 ? 'پروفایل ۱' : 'پروفایل ۲';
            exerciseList.innerHTML = `<li>برنامه‌ای برای این روز در ${profileText} یافت نشد.</li>`;
            return;
        }
        plan.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.exercise_name} (${item.sets_count} ست)`;
            li.dataset.exerciseName = item.exercise_name;
            li.dataset.setsCount = item.sets_count;
            li.addEventListener('click', () => {
                document.querySelectorAll('#exercises li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                renderSetInputs(item.exercise_name, item.sets_count);
            });
            exerciseList.appendChild(li);
        });
    }
    
    // نمایش فرم ورود وزنه و تکرار
    function renderSetInputs(exerciseName, setsCount) {
        currentExerciseTitle.innerText = `حرکت: ${exerciseName}`;
        setsContainer.innerHTML = '';
        for (let i = 1; i <= setsCount; i++) {
            const setRow = document.createElement('div');
            setRow.classList.add('set-row');
            setRow.innerHTML = `
                <label>ست ${i}</label>
                <input type="number" placeholder="وزنه (kg)" class="weight-input" />
                <input type="number" placeholder="تکرار" class="reps-input" />
                <button class="save-set-btn" data-set-number="${i}">ذخیره</button>
            `;
            setsContainer.appendChild(setRow);
        }
        document.querySelectorAll('.save-set-btn').forEach(btn => {
            btn.addEventListener('click', saveSet);
        });
    }

    // ذخیره کردن اطلاعات یک ست
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
            const result = await response.json();
            btn.textContent = 'ذخیره شد';
            btn.disabled = true;
            btn.classList.add('saved');
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    // مدیریت آپلود فایل اکسل
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
                    body: JSON.stringify({ planData, profileId: currentProfileId })
                });
                if (!response.ok) throw new Error('خطا در آپلود فایل');
                alert(`برنامه برای پروفایل ${currentProfileId} با موفقیت آپلود شد!`);
                if(currentDay) fetchPlanForDay(currentDay);
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // نمایش گزارش روز
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