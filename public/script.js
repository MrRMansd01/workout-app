document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '';

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

    let currentDay = '';
    let currentPlan = [];
    let currentProfileId = 1;

    // Show success message
    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Profile button events
    profileButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentProfileId = parseInt(button.dataset.profile);
            profileButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            setsContainer.innerHTML = '<div class="empty-state"><div style="font-size: 3rem; margin-bottom: 10px;">📝</div><p>برای شروع ثبت، حرکت مورد نظر را انتخاب کنید</p></div>';
            currentExerciseTitle.innerHTML = '⚡ یک حرکت را انتخاب کنید';
            document.querySelectorAll('#exercises li').forEach(el => el.classList.remove('active'));
            
            showToast(`پروفایل ${currentProfileId} انتخاب شد`);
        });
    });

    // Day selection events
    daysOfWeek.forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            currentDay = dayEl.dataset.day;
            daysOfWeek.forEach(d => d.classList.remove('active'));
            dayEl.classList.add('active');
            document.getElementById('today-program-title').innerHTML = `📅 برنامه روز: ${currentDay}`;
            fetchPlanForDay(currentDay);
            
            // Animate transition
            animateTransition(exerciseList);
        });
    });

    // Fetch plan for selected day
    async function fetchPlanForDay(day) {
        try {
            exerciseList.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading"></div><p style="margin-top: 10px;">در حال بارگذاری...</p></div>';
            
            const response = await fetch(`${API_BASE_URL}/api/plan?day=${day}`);
            if (!response.ok) throw new Error('خطا در دریافت اطلاعات');
            currentPlan = await response.json();
            renderPlan(currentPlan);
        } catch (error) {
            console.error(error);
            exerciseList.innerHTML = '<div class="empty-state"><div style="font-size: 3rem; margin-bottom: 10px; color: #e74c3c;">❌</div><p>خطا در بارگذاری برنامه</p></div>';
            showToast('خطا در بارگذاری برنامه', 'error');
        }
    }

    function renderPlan(plan) {
        exerciseList.innerHTML = '';
        setsContainer.innerHTML = '<div class="empty-state"><div style="font-size: 3rem; margin-bottom: 10px;">📝</div><p>برای شروع ثبت، حرکت مورد نظر را انتخاب کنید</p></div>';
        currentExerciseTitle.innerHTML = '⚡ یک حرکت را انتخاب کنید';
        
        if (plan.length === 0) {
            exerciseList.innerHTML = '<div class="empty-state"><div style="font-size: 3rem; margin-bottom: 10px;">🤷‍♂️</div><p>برنامه‌ای برای این روز یافت نشد</p></div>';
            return;
        }
        
        plan.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${item.exercise_name}</strong>
                <br>
                <small>${item.sets_count} ست</small>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
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
    
    function renderSetInputs(exerciseName, setsCount) {
        currentExerciseTitle.innerHTML = `🏋️ ${exerciseName}`;
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
        
        // Add enter key support for inputs
        document.querySelectorAll('.reps-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const setRow = e.target.closest('.set-row');
                    const saveBtn = setRow.querySelector('.save-set-btn');
                    if (saveBtn && !saveBtn.disabled) {
                        saveBtn.click();
                    }
                }
            });
        });
    }

    async function saveSet(event) {
        const btn = event.target;
        const setRow = btn.closest('.set-row');
        const weight = setRow.querySelector('.weight-input').value;
        const reps = setRow.querySelector('.reps-input').value;
        const setNumber = btn.dataset.setNumber;
        const exerciseName = currentExerciseTitle.textContent.replace('🏋️ ', '');
        
        if (!weight || !reps) {
            showToast('لطفا مقادیر وزنه و تکرار را وارد کنید.', 'error');
            return;
        }

        btn.innerHTML = '<div class="loading"></div>';
        btn.disabled = true;

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
            
            btn.textContent = '✅ ذخیره شد';
            btn.classList.add('saved');
            showToast(`ست ${setNumber} با موفقیت ثبت شد!`);
            updateProgress(exerciseName);
            
            // Add vibration feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
        } catch (error) {
            console.error(error);
            btn.textContent = 'خطا!';
            btn.disabled = false;
            showToast(error.message, 'error');
        }
    }

    // Add progress bar for sets completion
    function updateProgress(exerciseName) {
        const exerciseItem = document.querySelector(`[data-exercise-name="${exerciseName}"]`);
        if (!exerciseItem) return;
        
        const totalSets = parseInt(exerciseItem.dataset.setsCount);
        const completedSets = document.querySelectorAll('.save-set-btn.saved').length;
        const progressPercent = (completedSets / totalSets) * 100;
        
        const progressFill = exerciseItem.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
        
        // Show completion notification
        if (completedSets === totalSets) {
            showToast(`🎉 تمام ست‌های ${exerciseName} تکمیل شد!`);
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }
        }
    }

    // Excel upload handling
    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

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
                        if (row['حرکت'] && row['تعداد ست']) {
                            planData.push({
                                day_name: sheetName,
                                exercise_name: row['حرکت'],
                                sets_count: row['تعداد ست']
                            });
                        }
                    });
                });

                if (planData.length === 0) {
                    throw new Error('فایل اکسل معتبر نیست یا خالی است');
                }

                const response = await fetch(`${API_BASE_URL}/api/upload-plan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planData })
                });
                
                if (!response.ok) throw new Error('خطا در آپلود فایل');
                
                showToast('برنامه مشترک با موفقیت آپلود شد! 🎉');
                if(currentDay) fetchPlanForDay(currentDay);
                
            } catch (error) {
                console.error(error);
                showToast(error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // Report functionality
    reportBtn.addEventListener('click', async () => {
        const today = new Date().toISOString().split('T')[0];
        try {
            reportBtn.innerHTML = '<div class="loading"></div> در حال تهیه گزارش...';
            reportBtn.disabled = true;
            
            const response = await fetch(`${API_BASE_URL}/api/report?date=${today}&profileId=${currentProfileId}`);
            if (!response.ok) throw new Error('خطا در دریافت گزارش');
            const report = await response.json();
            
            let reportText = `📊 گزارش تاریخ: ${today}\n👤 پروفایل: ${currentProfileId}\n${'='.repeat(40)}\n\n`;
            
            if (report.length === 0) {
                reportText += "🤷‍♂️ امروز هیچ حرکتی ثبت نشده است.";
            } else {
                const exercises = {};
                report.forEach(log => {
                    if (!exercises[log.exercise_name]) {
                        exercises[log.exercise_name] = [];
                    }
                    exercises[log.exercise_name].push(log);
                });
                
                for (const exName in exercises) {
                    reportText += `🏋️ ${exName}\n${'-'.repeat(20)}\n`;
                    exercises[exName].forEach(log => {
                        reportText += `   ست ${log.set_number}: ${log.weight} کیلوگرم × ${log.reps} تکرار\n`;
                    });
                    reportText += '\n';
                }
            }
            
            reportDataEl.textContent = reportText;
            modal.style.display = 'block';
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            reportBtn.textContent = '📈 گزارش امروز';
            reportBtn.disabled = false;
        }
    });
    
    // Modal controls
    closeModalBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Add touch gestures for mobile
    let touchStartY = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', e => {
        touchStartY = e.changedTouches[0].screenY;
    });

    document.addEventListener('touchend', e => {
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > swipeThreshold) {
            // Add any swipe functionality here if needed
        }
    }

    // Auto-select today's day on load
    const today = new Date();
    const dayNames = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
    const todayName = dayNames[today.getDay()];
    
    const todayElement = document.querySelector(`[data-day="${todayName}"]`);
    if (todayElement) {
        setTimeout(() => {
            todayElement.click();
        }, 500);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.style.display = 'none';
        }
        
        if (e.key === 'Enter' && e.target.classList.contains('reps-input')) {
            const setRow = e.target.closest('.set-row');
            const saveBtn = setRow.querySelector('.save-set-btn');
            if (saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
        }
        
        // Number keys 1-7 for day selection
        if (e.key >= '1' && e.key <= '7' && !e.target.matches('input')) {
            const dayIndex = parseInt(e.key) - 1;
            const dayElement = document.querySelectorAll('.day')[dayIndex];
            if (dayElement) {
                dayElement.click();
            }
        }
        
        // P key for profile switching
        if (e.key.toLowerCase() === 'p' && !e.target.matches('input')) {
            const nextProfile = currentProfileId === 1 ? 2 : 1;
            const profileBtn = document.querySelector(`[data-profile="${nextProfile}"]`);
            if (profileBtn) {
                profileBtn.click();
            }
        }
        
        // R key for report
        if (e.key.toLowerCase() === 'r' && !e.target.matches('input')) {
            reportBtn.click();
        }
    });

    // Add animation when switching between days
    function animateTransition(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100);
    }

    // Service Worker registration for offline functionality
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    }

    // Add notification support
    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }

    function showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    }

    // Request notification permission on first interaction
    document.addEventListener('click', requestNotificationPermission, { once: true });

    // Add PWA install prompt
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 نصب اپلیکیشن';
        installBtn.className = 'upload-btn';
        installBtn.style.marginTop = '10px';
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    showToast('اپلیکیشن با موفقیت نصب شد! 🎉');
                }
                deferredPrompt = null;
                installBtn.remove();
            }
        });
        
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(installBtn);
        }
    });

    // Add data backup functionality
    function exportData() {
        const data = {
            currentProfileId,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `workout-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Add backup button
    const backupBtn = document.createElement('button');
    backupBtn.textContent = '💾 پشتیبان‌گیری';
    backupBtn.className = 'upload-btn';
    backupBtn.style.marginTop = '10px';
    backupBtn.addEventListener('click', exportData);
    
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.appendChild(backupBtn);
    }

    // Add performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`Page loaded in ${loadTime}ms`);
        });
    }

    // Add error boundary
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        showToast('خطای غیرمنتظره رخ داد', 'error');
    });

    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        showToast('خطا در پردازش درخواست', 'error');
    });
});
