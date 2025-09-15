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

// اندپوینت برای آپلود برنامه از اکسل
app.post('/api/upload-plan', async (req, res) => {
    const { planData, profileId } = req.body;

    if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
    }

    // 1. پاک کردن برنامه قبلی فقط برای پروفایل مشخص شده
    const { error: deleteError } = await supabase
        .from('workout_plans')
        .delete()
        .eq('profile_id', profileId);

    if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
    }

    const dataToInsert = planData.map(item => ({ ...item, profile_id: profileId }));

    // 2. وارد کردن برنامه جدید
    const { data, error: insertError } = await supabase
        .from('workout_plans')
        .insert(dataToInsert)
        .select();

    if (insertError) {
        return res.status(500).json({ error: insertError.message });
    }

    res.status(200).json({ message: 'برنامه با موفقیت آپلود شد', data });
});

// اندپوینت برای گرفتن برنامه یک روز خاص
app.get('/api/plan', async (req, res) => {
    const { day, profileId } = req.query;

    if (!profileId) {
        return res.status(400).json({ error: 'Profile ID is required' });
    }

    const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('day_name', day)
        .eq('profile_id', profileId);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
});

// اندپوینت برای ثبت یک ست از یک حرکت
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


// اندپوینت برای دریافت گزارش یک روز خاص
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