// api/index.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const supabaseUrl = "https://oztfsqvtqvcupduyceyp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGZzcXZ0cXZjdXBkdXljZXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTg1NDMsImV4cCI6MjA3MzUzNDU0M30.VMHFUPNj2deLnp0XRCzclCUcuHIl3RroB1NDQqWS8i8";
const supabase = createClient(supabaseUrl, supabaseKey);

// اندپوینت برای آپلود برنامه از اکسل (تغییر یافته)
app.post('/api/upload-plan', async (req, res) => {
    // profileId از اینجا حذف شد چون برنامه برای همه مشترک است
    const { planData } = req.body;

    // ۱. پاک کردن کل برنامه قبلی
    const { error: deleteError } = await supabase
        .from('workout_plans')
        .delete()
        .neq('id', 0); // ترفندی برای پاک کردن همه ردیف‌ها

    if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
    }
    
    // ۲. وارد کردن برنامه جدید (بدون profile_id)
    const { data, error: insertError } = await supabase
        .from('workout_plans')
        .insert(planData) // دیگر نیازی به map کردن و افزودن profile_id نیست
        .select();

    if (insertError) {
        return res.status(500).json({ error: insertError.message });
    }

    res.status(200).json({ message: 'برنامه با موفقیت آپلود شد', data });
});

// اندپوینت برای گرفتن برنامه یک روز خاص (تغییر یافته)
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

// اندپوینت برای ثبت یک ست (بدون تغییر) - این بخش به درستی از profileId استفاده می‌کند
app.post('/api/log-set', async (req, res) => {
    const { log_date, exercise_name, set_number, weight, reps, profileId } = req.body;

    if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
    }

    const { data, error } = await supabase
        .from('workout_logs')
        .insert([{ log_date, exercise_name, set_number, weight, reps, profile_id: profileId }])
        .select();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'ست با موفقیت ثبت شد', data });
});


// اندپوینت برای دریافت گزارش یک روز خاص (بدون تغییر)
app.get('/api/report', async (req, res) => {
    const { date, profileId } = req.query;

    if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
    }

    const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('log_date', date)
        .eq('profile_id', profileId)
        .order('created_at');

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
});


module.exports = app;
