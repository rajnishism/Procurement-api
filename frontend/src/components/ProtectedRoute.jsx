import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps children with auth + optional role/team check.
 * @param {string[]} allowedRoles — optional list of roles that can access this route
 * @param {string[]} allowedTeams — optional list of teams that can access this route
 */
const ProtectedRoute = ({ children, allowedRoles, allowedTeams }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Role check
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-5 bg-red-50 rounded-full text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800">Access Denied</h2>
                <p className="text-gray-500 max-w-md font-medium">
                    Your role ({user.role}) does not have permission to access this resource.
                    Contact your administrator for access.
                </p>
            </div>
        );
    }

    // Team check (ADMIN role and GENERAL team bypass)
    if (allowedTeams && user.role !== 'ADMIN' && user.team !== 'GENERAL' && !allowedTeams.includes(user.team)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-5 bg-amber-50 rounded-full text-amber-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
                <h2 className="text-2xl font-black text-gray-800">Module Not Assigned</h2>
                <p className="text-gray-500 max-w-md font-medium">
                    Your team ({user.team?.replace('_', ' ')}) does not have access to this module.
                    Contact your administrator to update your team assignment.
                </p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;

