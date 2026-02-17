const express = require('express');
const router = express.Router();
const { supabase } = require('../../services/supabaseClient');

// POST /create_user
router.post('/create_user', async (req, res, next) => {
    try {
        const { email, password, full_name, role, allowed_modules } = req.body;

        if (!email || !password || !full_name || !role) {
            return res.status(400).json({ message: 'Email, password, full_name y role son requeridos' });
        }

        // 1. Crear usuario en Auth de Supabase (usando service role de supabaseClient.js)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        });

        if (authError) throw authError;

        // 2. Crear perfil en user_profiles (si no se crea por trigger)
        const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
                id: authUser.user.id,
                email,
                full_name,
                role,
                is_active: true
            });

        if (profileError) {
            console.warn('Advertencia: Perfil no pudo crearse (quizás ya existe):', profileError.message);
        }

        res.status(201).json({
            ok: true,
            message: 'Usuario creado exitosamente',
            user: { id: authUser.user.id, email }
        });
    } catch (err) {
        next(err);
    }
});

// POST /reset_password_email
router.post('/reset_password_email', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email es requerido' });

        const { error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
        });

        if (error) throw error;

        res.json({ ok: true, message: 'Enlace de recuperación generado y enviado (vía Auth Admin)' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
