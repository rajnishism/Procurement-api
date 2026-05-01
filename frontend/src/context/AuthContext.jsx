import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Post-login transition overlay state
    const [loginTransition, setLoginTransition] = useState(null);
    // loginTransition: null | { phase: 'success' | 'reveal' | 'done', userName: string }

    // On mount, check for existing session
    useEffect(() => {
        api.get('/auth/me')
            .then(res => setUser(res.data))
            .catch(() => {
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { user: userData } = res.data;
        setUser(userData);
        return userData;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout failed', err);
        } finally {
            setUser(null);
        }
    };

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data);
            return res.data;
        } catch (err) {
            console.error('Failed to refresh user', err);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, setUser, loading, login, logout, refreshUser,
            loginTransition, setLoginTransition
        }}>
            {children}
        </AuthContext.Provider>
    );
};
