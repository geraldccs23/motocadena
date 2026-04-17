import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { UserProfile, Role } from '../types';

interface AuthContextType {
    user: any;
    profile: UserProfile | null;
    loading: boolean;
    hasRole: (roles: Role[]) => boolean;
    loginDemo: () => void;
    logout: () => Promise<void>;
    fetchProfile: (userId: string, email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_PROFILE: UserProfile = {
    id: 'demo-id',
    workshop_id: 'workshop-1',
    full_name: 'Staff Motocadena (Admin)',
    email: 'admin@motocadena.com',
    role: 'DIRECTOR',
    is_active: true
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    const fetchProfile = useCallback(async (userId: string, email: string) => {
        console.log("🔍 AuthContext: Fetching profile for", email, "with ID:", userId);

        // Safety timeout - increased for better reliability on slower connections
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn("⏱️ AuthContext: Profile fetch is taking too long (15s). Still waiting...");
            }
        }, 15000);

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            clearTimeout(timeoutId);

            if (error) {
                console.error("❌ AuthContext: Error fetching profile:", error);
                throw error;
            }

            if (data) {
                console.log("✅ AuthContext: Profile loaded successfully:", data.full_name);
                setProfile(data as UserProfile);
            } else {
                console.warn("⚠️ AuthContext: No profile record found for this ID in 'user_profiles'.");
                // Only use fallback if we are SURE it's missing from DB
                setProfile({
                    ...MOCK_PROFILE,
                    id: userId,
                    full_name: email.split('@')[0].toUpperCase() + ' (PENDIENTE)',
                    email: email,
                    role: 'VENDEDOR' // More restricted default role
                });
            }
        } catch (e: any) {
            clearTimeout(timeoutId);
            console.error("❌ AuthContext: Critical failure in fetchProfile:", e.message);
            // Fallback as last resort for critical errors
            setProfile({
                ...MOCK_PROFILE,
                id: userId,
                full_name: email.split('@')[0].toUpperCase() + ' (FALLBACK)',
                email: email
            });
        } finally {
            setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        console.log("🚀 AuthContext: Mounting Provider Effect");

        // Initial Auth Check
        const initAuth = async () => {
            if (initialized.current) return;
            initialized.current = true;

            console.log("🛠️ AuthContext: Initializing Auth state...");

            if (localStorage.getItem('motocadena_demo_mode') === 'true') {
                console.log("🕶️ AuthContext: Demo mode active");
                setUser({ id: 'demo-user', email: 'demo@motocadena.com' });
                setProfile(MOCK_PROFILE);
                setLoading(false);
                return;
            }

            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) console.error("❌ AuthContext: getSession error:", sessionError);

                if (session?.user) {
                    console.log("👤 AuthContext: Session found during init:", session.user.email);
                    setUser(session.user);
                    await fetchProfile(session.user.id, session.user.email || '');
                } else {
                    console.log("🚫 AuthContext: No session found during init.");
                    setLoading(false);
                }
            } catch (e) {
                console.error("❌ AuthContext: Error during initAuth:", e);
                setLoading(false);
            }
        };

        initAuth();

        console.log("📡 AuthContext: Setting up onAuthStateChange listener");
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`🔄 AuthContext: Event [${event}] for ${session?.user?.email || 'no-user'}`);

            if (session?.user) {
                setUser(session.user);
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                    console.log(`⚡ AuthContext: Triggering profile fetch for [${event}]`);
                    await fetchProfile(session.user.id, session.user.email || '');
                }
            } else if (event === 'SIGNED_OUT') {
                if (localStorage.getItem('motocadena_demo_mode') !== 'true') {
                    console.log("👋 AuthContext: User signed out, clearing state");
                    setUser(null);
                    setProfile(null);
                    setLoading(false);
                }
            } else {
                // If we are initializing and have no session, make sure to stop loading
                if (!session && loading) {
                    setLoading(false);
                }
            }
        });

        return () => {
            console.log("🧹 AuthContext: Cleaning up AuthProvider");
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const loginDemo = () => {
        localStorage.setItem('motocadena_demo_mode', 'true');
        setUser({ id: 'demo-user', email: 'demo@motocadena.com' });
        setProfile(MOCK_PROFILE);
        setLoading(false);
    };

    const logout = async () => {
        console.log("🚪 AuthContext: Logging out...");
        setLoading(true);
        localStorage.removeItem('motocadena_demo_mode');
        await supabase.auth.signOut().catch(() => { });
        setUser(null);
        setProfile(null);
        setLoading(false);
        window.location.hash = '#/admin/login';
    };

    const hasRole = (roles: Role[]) => profile ? roles.includes(profile.role) : false;

    return (
        <AuthContext.Provider value={{ user, profile, loading, hasRole, loginDemo, logout, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
