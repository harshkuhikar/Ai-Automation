/**
 * AI Marketing Platform
 * 
 * @author Harsh J Kuhikar
 * @copyright 2025 Harsh J Kuhikar. All Rights Reserved.
 * @license Proprietary - All rights reserved to Harsh J Kuhikar
 * @version 1.0.0
 * 
 * This software is the exclusive property of Harsh J Kuhikar.
 * Unauthorized copying, modification, distribution, or use of this software,
 * via any medium, is strictly prohibited without explicit written permission
 * from Harsh J Kuhikar.
 * 
 * For licensing inquiries, contact: Harsh J Kuhikar
 */

import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, FileText, BarChart3, Search, TrendingUp, UserPlus, Share2, ChevronLeft, ChevronRight, DollarSign, User, Settings, LogOut, HelpCircle, History } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { usePlan } from '../context/PlanContext'
import axios from 'axios'

// Production API URL - Railway Backend
const API_URL = import.meta.env.PROD
    ? 'https://ai-automation-production-c35e.up.railway.app/api'
    : 'http://localhost:3001/api'

// Copyright: Harsh J Kuhikar - All Rights Reserved
const tools = [
    { name: 'Content Creation', path: '/tools/content-creation', icon: FileText },
    { name: 'Job History', path: '/tools/job-history', icon: History },
    { name: 'Client Reporting', path: '/tools/client-reporting', icon: BarChart3 },
    { name: 'SEO Automation', path: '/tools/seo-automation', icon: Search },
    { name: 'Campaign Optimization', path: '/tools/campaign-optimization', icon: TrendingUp },
    { name: 'Client Onboarding', path: '/tools/client-onboarding', icon: UserPlus },
    { name: 'Social Media', path: '/tools/social-media', icon: Share2 },
    { name: 'Pricing', path: '/pricing', icon: DollarSign },
]

// Developed by: Harsh J Kuhikar
export default function Layout({ children }) {
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const location = useLocation()
    const { currentPlan } = usePlan()
    const dropdownRef = useRef(null)
    const [userName, setUserName] = useState('User')
    const [userInitials, setUserInitials] = useState('U')
    const [userProfileImage, setUserProfileImage] = useState(null)

    // Load user data on mount and when profile is updated
    useEffect(() => {
        loadUserData()

        // Listen for profile updates
        window.addEventListener('profileUpdated', loadUserData)
        return () => window.removeEventListener('profileUpdated', loadUserData)
    }, [])

    const loadUserData = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                // No token, redirect to login
                navigate('/login')
                return
            }

            const response = await axios.get(`${API_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.data) {
                // Get name from profile or user data
                const firstName = response.data.profile?.firstName || response.data.name?.split(' ')[0] || 'User'
                const lastName = response.data.profile?.lastName || response.data.name?.split(' ')[1] || ''
                const fullName = `${firstName} ${lastName}`.trim()

                setUserName(fullName)
                setUserInitials(`${firstName[0]}${lastName[0] || ''}`.toUpperCase())
                setUserProfileImage(response.data.profile?.profileImage || null)
            }
        } catch (error) {
            console.error('Load user data error:', error)

            // If 403 (invalid token) or 401 (unauthorized), logout and redirect
            if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                console.log('Invalid or expired token - logging out')
                localStorage.clear()
                navigate('/login')
            }
        }
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setProfileDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Creator: Harsh J Kuhikar
    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Desktop Sidebar - Created by Harsh J Kuhikar */}
            <aside
                className={`hidden md:flex flex-col bg-white border-r transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'
                    }`}
            >
                {/* Logo & Toggle */}
                <div className="h-16 flex items-center justify-between px-4 border-b">
                    {sidebarOpen && (
                        <Link to="/" className="text-xl font-bold text-blue-600">
                            AI Marketing
                        </Link>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
                    >
                        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="space-y-1 px-2">
                        {tools.map((tool) => {
                            const Icon = tool.icon
                            const isActive = location.pathname === tool.path
                            return (
                                <Link
                                    key={tool.path}
                                    to={tool.path}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    title={!sidebarOpen ? tool.name : ''}
                                >
                                    <Icon size={20} className="flex-shrink-0" />
                                    {sidebarOpen && (
                                        <span className="text-sm font-medium">{tool.name}</span>
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                {/* Profile Section - Desktop */}
                <div className="p-4 border-t relative" ref={dropdownRef}>
                    {sidebarOpen ? (
                        <div>
                            <button
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold overflow-hidden">
                                    {userProfileImage ? (
                                        <img src={userProfileImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        userInitials
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-semibold text-gray-900">{userName}</p>
                                    <p className="text-xs text-gray-500 uppercase">{currentPlan} Plan</p>
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {profileDropdownOpen && (
                                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-xl border py-2 z-50">
                                    <Link
                                        to="/profile"
                                        onClick={() => setProfileDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <User size={18} className="text-gray-600" />
                                        <span className="text-sm font-medium">Profile</span>
                                    </Link>
                                    <Link
                                        to="/settings"
                                        onClick={() => setProfileDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <Settings size={18} className="text-gray-600" />
                                        <span className="text-sm font-medium">Settings</span>
                                    </Link>
                                    <Link
                                        to="/pricing"
                                        onClick={() => setProfileDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <DollarSign size={18} className="text-gray-600" />
                                        <span className="text-sm font-medium">Upgrade Plan</span>
                                    </Link>
                                    <div className="border-t my-2"></div>
                                    <Link
                                        to="/policies"
                                        onClick={() => setProfileDropdownOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                                    >
                                        <HelpCircle size={18} className="text-gray-600" />
                                        <span className="text-sm font-medium">Help & Policies</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            // Clear authentication data
                                            localStorage.removeItem('token')
                                            localStorage.removeItem('user')
                                            setProfileDropdownOpen(false)
                                            // Redirect to home page
                                            navigate('/')
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
                                    >
                                        <LogOut size={18} />
                                        <span className="text-sm font-medium">Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                                JD
                            </div>
                        </button>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {
                mobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                )
            }

            {/* Mobile Sidebar - Developed by Harsh J Kuhikar */}
            <aside
                className={`md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white border-r z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo & Close */}
                <div className="h-16 flex items-center justify-between px-4 border-b">
                    <Link
                        to="/"
                        className="text-xl font-bold text-blue-600"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        AI Marketing
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="space-y-1 px-2">
                        {tools.map((tool) => {
                            const Icon = tool.icon
                            const isActive = location.pathname === tool.path
                            return (
                                <Link
                                    key={tool.path}
                                    to={tool.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="text-sm font-medium">{tool.name}</span>
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                {/* Footer - Copyright Harsh J Kuhikar */}
                <div className="p-4 border-t">
                    <div className="text-xs text-gray-500">
                        <p className="font-semibold mb-1">AI Marketing Platform</p>
                        <p className="mb-2">Powered by AI</p>
                        <div className="pt-2 border-t border-gray-200">
                            <p className="font-semibold text-gray-700">© 2025 Harsh J Kuhikar</p>
                            <p className="text-[10px] mt-1">All Rights Reserved</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="md:hidden h-16 bg-white border-b flex items-center justify-between px-4">
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-700"
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="text-xl font-bold text-blue-600">
                        AI Marketing
                    </Link>
                    <Link to="/profile" className="p-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            JD
                        </div>
                    </Link>
                </header>

                {/* Page Content - Built by Harsh J Kuhikar */}
                <main className="flex-1 overflow-auto">{children}</main>

                {/* Main Footer - Copyright Harsh J Kuhikar */}
                <footer className="bg-white border-t py-6 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold">AI Marketing Platform</span> - Powered by Advanced AI
                            </div>
                            <div className="flex gap-4 text-sm">
                                <Link to="/profile" className="text-gray-600 hover:text-blue-600">Profile</Link>
                                <Link to="/settings" className="text-gray-600 hover:text-blue-600">Settings</Link>
                                <Link to="/policies" className="text-gray-600 hover:text-blue-600">Policies</Link>
                                <Link to="/pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link>
                            </div>
                        </div>
                        <div className="text-center text-sm text-gray-700 border-t pt-4">
                            <span className="font-semibold">© 2025 Harsh J Kuhikar</span>
                            <span className="mx-2">•</span>
                            <span>All Rights Reserved</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div >
    )
}

/* 
 * End of file
 * Copyright © 2025 Harsh J Kuhikar
 * All Rights Reserved
 * Unauthorized use, reproduction, or distribution is prohibited
 */
