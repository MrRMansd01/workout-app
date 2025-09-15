// api/index.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// اطلاعات پروژه سوپابیس خود را اینجا وارد کنید
// این مقادیر باید به عنوان Environment Variables در Vercel تنظیم شوند
const supabaseUrl = "https://oztfsqvtqvcupduyceyp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGZzcXZ0cXZjdXBkdXljZXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTg1NDMsImV4cCI6MjA3MzUzNDU0M30.VMHFUPNj2deLnp0XRCzclCUcuHIl3RroB1NDQqWS8i8";
const supabase = createClient(supabaseUrl, supabaseKey);

// اندپوینت برای آپلود برنامه از اکسل
app.post('/api/upload-plan', async (req, res) => {
    const { planData } = req.body; // داده‌ها از فرانت به صورت JSON می‌آیند

    // 1. پاک کردن برنامه قبلی
    const { error: deleteError } = await supabase
        .from('workout_plans')
        .delete()
        .gt('id', 0); // یک شرط برای حذف همه رکوردها

    if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
    }

    // 2. وارد کردن برنامه جدید
    const { data, error: insertError } = await supabase
        .from('workout_plans')
        .insert(planData)
        .select();

    if (insertError) {
        return res.status(500).json({ error: insertError.message });
    }

    res.status(200).json({ message: 'برنامه با موفقیت آپلود شد', data });
});

// اندپوینت برای گرفتن برنامه یک روز خاص
app.get('/api/plan', async (req, res) => {
    const { day } = req.query;

    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('day_name', day);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
});

// اندپوینت برای ثبت یک ست از یک حرکت
app.post('/api/log-set', async (req, res) => {
    const { log_date, exercise_name, set_number, weight, reps } = req.body;

    const { data, error } = await supabase
        .from('workout_logs')
        .insert([{ log_date, exercise_name, set_number, weight, reps }])
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'ست با موفقیت ثبت شد', data });
});


// اندپوینت برای دریافت گزارش یک روز خاص
app.get('/api/report', async (req, res) => {
    const { date } = req.query; // تاریخ با فرمت YYYY-MM-DD

    const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('log_date', date)
        .order('created_at');

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
});


// Export the app for Vercel
module.exports = app;