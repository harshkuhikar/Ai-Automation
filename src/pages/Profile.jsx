/**
 * AI Marketing Platform - Profile Page
 * 
 * @author Harsh J Kuhikar
 * @copyright 2025 Harsh J Kuhikar. All Rights Reserved.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Phone, MapPin, Building, Globe, Calendar, Award, TrendingUp, Target, Briefcase, Camera, Shield, Bell, Link as LinkIcon, Twitter, Linkedin, Github, Instagram, Save, Edit2, Check, X } from 'lucide-react'
import { usePlan } from '../context/PlanContext'
import axios from 'axios'

// Production API URL - Railway Backend
const API_URL = import.meta.env.PROD
    ? 'https://ai-automation-production-c35e.up.railway.app/api'
    : 'http://localhost:3001/api'

export default function Profile() {
    const navigate = useNavigate()
    const { currentPlan } = usePlan()
    const [isEditing, setIsEditing] = useState(false)
    const [activeTab, setActiveTab] = useState('personal')
    const [loading, setLoading] = useState(true)
    const [uploadingImage, setUploadingImage] = useState(false)

    const [profile, setProfile] = useState({
        // Personal Info
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '+91 98765 43210',
        dateOfBirth: '1990-05-15',
        gender: 'Male',
        profileImage: null,

        // Professional Info
        jobTitle: 'Marketing Manager',
        company: 'Tech Solutions Inc.',
        department: 'Digital Marketing',
        employeeId: 'EMP-2024-001',
        joiningDate: '2023-01-15',

        // Location
        address: '123 Business Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001',
        timezone: 'Asia/Kolkata',

        // Social Links
        website: 'https://johndoe.com',
        twitter: '@johndoe',
        linkedin: 'linkedin.com/in/johndoe',
        github: 'github.com/johndoe',
        instagram: '@johndoe_official',

        // Bio
        bio: 'Experienced marketing professional with 5+ years in digital marketing and automation.',

        // Stats
        projectsCompleted: 47,
        campaignsLaunched: 156,
        clientsServed: 23,
        reportsGenerated: 892
    })

    // Load profile from MongoDB on mount
    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                console.error('No token found - redirecting to login')
                localStorage.clear()
                navigate('/login')
                return
            }

            const response = await axios.get(`${API_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            // Merge loaded profile with default values
            if (response.data.profile) {
                setProfile(prev => ({
                    ...prev,
                    ...response.data.profile
                }))
            }

            setLoading(false)
        } catch (error) {
            console.error('Load profile error:', error)

            // If 403 (invalid token) or 401 (unauthorized), logout and redirect
            if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                console.log('Invalid or expired token - logging out')
                localStorage.clear()
                navigate('/login')
                return
            }

            setLoading(false)
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('❌ Please select an image file')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ Image size must be less than 5MB')
            return
        }

        setUploadingImage(true)

        try {
            const token = localStorage.getItem('token')
            if (!token) {
                alert('❌ Please login first')
                return
            }

            // Convert image to base64
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const base64Image = event.target?.result

                    // Save image to MongoDB
                    await axios.put(`${API_URL}/profile`, {
                        ...profile,
                        profileImage: base64Image
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    })

                    // Update local state
                    setProfile(prev => ({
                        ...prev,
                        profileImage: base64Image
                    }))

                    alert('✅ Profile image uploaded successfully!')
                    window.dispatchEvent(new Event('profileUpdated'))
                    setUploadingImage(false)
                } catch (error) {
                    console.error('Image upload error:', error)
                    if (error.response?.status === 413) {
                        alert('❌ Image is too large. Please choose a smaller image (under 5MB)')
                    } else {
                        alert('❌ Failed to upload image. Please try again.')
                    }
                    setUploadingImage(false)
                }
            }
            reader.onerror = () => {
                alert('❌ Failed to read image file')
                setUploadingImage(false)
            }
            reader.readAsDataURL(file)
        } catch (error) {
            console.error('Image upload error:', error)
            alert('❌ Failed to upload image. Please try again.')
        } finally {
            setUploadingImage(false)
        }
    }

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                alert('❌ Please login first')
                return
            }

            // Save to MongoDB
            await axios.put(`${API_URL}/profile`, profile, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setIsEditing(false)
            alert('✅ Profile updated successfully and saved to database!')

            // Dispatch event to notify Layout component to refresh user data
            window.dispatchEvent(new Event('profileUpdated'))
        } catch (error) {
            console.error('Save profile error:', error)
            alert('❌ Failed to save profile. Please try again.')
        }
    }

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: User },
        { id: 'professional', label: 'Professional', icon: Briefcase },
        { id: 'location', label: 'Location', icon: MapPin },
        { id: 'social', label: 'Social Links', icon: LinkIcon },
        { id: 'stats', label: 'Statistics', icon: TrendingUp }
    ]

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading profile...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
                    }}></div>
                </div>

                <div className="relative flex items-start gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-6xl font-bold border-4 border-white/30 overflow-hidden">
                            {profile.profileImage ? (
                                <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span>{profile.firstName[0]}{profile.lastName[0]}</span>
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-white text-blue-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                            <Camera size={20} />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">{profile.firstName} {profile.lastName}</h1>
                                <p className="text-white/90 text-lg mb-4">{profile.jobTitle} at {profile.company}</p>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Mail size={16} /> {profile.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Phone size={16} /> {profile.phone}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center gap-2"
                            >
                                {isEditing ? <><Save size={20} /> Save Changes</> : <><Edit2 size={20} /> Edit Profile</>}
                            </button>
                        </div>

                        {/* Plan Badge */}
                        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                            <Award className="text-yellow-300" size={20} />
                            <span className="font-semibold uppercase">{currentPlan} Plan</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                        <Target className="text-blue-600" size={24} />
                        <span className="text-2xl font-bold">{profile.projectsCompleted}</span>
                    </div>
                    <p className="text-gray-600 text-sm">Projects Completed</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="text-green-600" size={24} />
                        <span className="text-2xl font-bold">{profile.campaignsLaunched}</span>
                    </div>
                    <p className="text-gray-600 text-sm">Campaigns Launched</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                        <User className="text-purple-600" size={24} />
                        <span className="text-2xl font-bold">{profile.clientsServed}</span>
                    </div>
                    <p className="text-gray-600 text-sm">Clients Served</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                        <Award className="text-orange-600" size={24} />
                        <span className="text-2xl font-bold">{profile.reportsGenerated}</span>
                    </div>
                    <p className="text-gray-600 text-sm">Reports Generated</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="flex border-b overflow-x-auto">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon size={20} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                <div className="p-8">
                    {/* Personal Info Tab */}
                    {activeTab === 'personal' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                                <input
                                    type="text"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                                <input
                                    type="text"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                                <input
                                    type="date"
                                    value={profile.dateOfBirth}
                                    onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                <select
                                    value={profile.gender}
                                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                    <option>Prefer not to say</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                                <textarea
                                    value={profile.bio}
                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                    disabled={!isEditing}
                                    rows={4}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Professional Tab */}
                    {activeTab === 'professional' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title</label>
                                <input
                                    type="text"
                                    value={profile.jobTitle}
                                    onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                                <input
                                    type="text"
                                    value={profile.company}
                                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                                <input
                                    type="text"
                                    value={profile.department}
                                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Employee ID</label>
                                <input
                                    type="text"
                                    value={profile.employeeId}
                                    onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Joining Date</label>
                                <input
                                    type="date"
                                    value={profile.joiningDate}
                                    onChange={(e) => setProfile({ ...profile, joiningDate: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Location Tab */}
                    {activeTab === 'location' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={profile.address}
                                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                                <input
                                    type="text"
                                    value={profile.city}
                                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                                <input
                                    type="text"
                                    value={profile.state}
                                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                                <input
                                    type="text"
                                    value={profile.country}
                                    onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code</label>
                                <input
                                    type="text"
                                    value={profile.zipCode}
                                    onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Timezone</label>
                                <select
                                    value={profile.timezone}
                                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                >
                                    <option>Asia/Kolkata</option>
                                    <option>America/New_York</option>
                                    <option>Europe/London</option>
                                    <option>Asia/Tokyo</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Social Links Tab */}
                    {activeTab === 'social' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Globe size={16} /> Website
                                </label>
                                <input
                                    type="url"
                                    value={profile.website}
                                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Twitter size={16} /> Twitter
                                </label>
                                <input
                                    type="text"
                                    value={profile.twitter}
                                    onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Linkedin size={16} /> LinkedIn
                                </label>
                                <input
                                    type="text"
                                    value={profile.linkedin}
                                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Github size={16} /> GitHub
                                </label>
                                <input
                                    type="text"
                                    value={profile.github}
                                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Instagram size={16} /> Instagram
                                </label>
                                <input
                                    type="text"
                                    value={profile.instagram}
                                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border rounded-lg disabled:bg-gray-50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Statistics Tab */}
                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Projects Completed</h3>
                                        <Target className="text-blue-600" size={24} />
                                    </div>
                                    <p className="text-4xl font-bold text-blue-600 mb-2">{profile.projectsCompleted}</p>
                                    <p className="text-sm text-gray-600">+12 this month</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Campaigns Launched</h3>
                                        <TrendingUp className="text-green-600" size={24} />
                                    </div>
                                    <p className="text-4xl font-bold text-green-600 mb-2">{profile.campaignsLaunched}</p>
                                    <p className="text-sm text-gray-600">+28 this month</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Clients Served</h3>
                                        <User className="text-purple-600" size={24} />
                                    </div>
                                    <p className="text-4xl font-bold text-purple-600 mb-2">{profile.clientsServed}</p>
                                    <p className="text-sm text-gray-600">+3 this month</p>
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Reports Generated</h3>
                                        <Award className="text-orange-600" size={24} />
                                    </div>
                                    <p className="text-4xl font-bold text-orange-600 mb-2">{profile.reportsGenerated}</p>
                                    <p className="text-sm text-gray-600">+67 this month</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

/* Copyright © 2025 Harsh J Kuhikar - All Rights Reserved */
