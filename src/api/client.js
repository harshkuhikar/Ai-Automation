import axios from 'axios';

// Auto-detect API URL based on environment
const getApiBase = () => {
  // If VITE_API_URL is set, use it (for split deployment: Vercel + Railway)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production on Vercel, use the Railway backend
  if (import.meta.env.PROD) {
    return 'https://ai-automation-production-c35e.up.railway.app/api';
  }
  // In development, use localhost
  return 'http://localhost:3001/api';
};

const API_BASE = getApiBase();

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Axios instance for direct use
  ...axiosInstance,
  // Leads with AI Scoring
  getLeads: async () => {
    const res = await fetch(`${API_BASE}/leads`);
    return res.json();
  },
  createLead: async (data) => {
    const res = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Content with AI Generation
  getContent: async () => {
    const res = await fetch(`${API_BASE}/content`);
    return res.json();
  },
  saveContent: async (data) => {
    const res = await fetch(`${API_BASE}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  generateContent: async (prompt) => {
    const res = await fetch(`${API_BASE}/content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate content');
    }
    return data;
  },
  generateHumanContent: async (config) => {
    const res = await fetch(`${API_BASE}/content/generate-human`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate content');
    }
    return data;
  },
  humanizeContent: async (content) => {
    const res = await fetch(`${API_BASE}/content/humanize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to humanize content');
    }
    return data;
  },
  searchRealImages: async (content, topic, numImages = 4) => {
    const res = await fetch(`${API_BASE}/images/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, topic, numImages }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to search images');
    }
    return data;
  },

  // Social Posts with AI Generation
  getSocialPosts: async () => {
    const res = await fetch(`${API_BASE}/social-posts`);
    return res.json();
  },
  createSocialPost: async (data) => {
    const res = await fetch(`${API_BASE}/social-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  generateSocialPost: async (topic, platform) => {
    const res = await fetch(`${API_BASE}/social-posts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, platform }),
    });
    return res.json();
  },

  // Clients
  getClients: async () => {
    const res = await fetch(`${API_BASE}/clients`);
    return res.json();
  },
  createClient: async (data) => {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Campaigns with AI Optimization
  getCampaigns: async () => {
    const res = await fetch(`${API_BASE}/campaigns`);
    return res.json();
  },
  optimizeCampaign: async (campaignData) => {
    const res = await fetch(`${API_BASE}/campaigns/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignData }),
    });
    return res.json();
  },

  // Chat with AI Responses
  getChatMessages: async () => {
    const res = await fetch(`${API_BASE}/chat-messages`);
    return res.json();
  },
  sendChatMessage: async (data) => {
    const res = await fetch(`${API_BASE}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // SEO with AI Analysis
  analyzeKeywords: async (keyword) => {
    const res = await fetch(`${API_BASE}/seo/keywords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
    return res.json();
  },
  analyzePage: async (url, keyword) => {
    const res = await fetch(`${API_BASE}/seo/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, keyword }),
    });
    return res.json();
  },
  checkTechnicalSEO: async (url) => {
    const res = await fetch(`${API_BASE}/seo/technical`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return res.json();
  },
  compareCompetitor: async (yourUrl, competitorUrl, keyword) => {
    const res = await fetch(`${API_BASE}/seo/competitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yourUrl, competitorUrl, keyword }),
    });
    return res.json();
  },

  // Analytics
  getMetrics: async () => {
    const res = await fetch(`${API_BASE}/analytics/metrics`);
    return res.json();
  },

  // Social Media Management
  getConnectedAccounts: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/accounts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  connectSocialAccount: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/accounts/connect`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to connect account');
    }
    return result;
  },
  disconnectSocialAccount: async (accountId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/accounts/${accountId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  getScheduledPosts: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/posts/scheduled`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  schedulePost: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/posts/schedule`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to schedule post');
    }
    return result;
  },
  postToSocial: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/posts/publish`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to publish post');
    }
    return result;
  },
  deleteScheduledPost: async (postId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },

  // WordPress Auto-Publishing
  getWordPressSites: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/sites`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  addWordPressSite: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/sites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to add WordPress site');
    }
    return result;
  },
  testWordPressSite: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/sites/test`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to test connection');
    }
    return result;
  },
  deleteWordPressSite: async (siteId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/sites/${siteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  publishToWordPress: async (data) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/publish`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to publish to WordPress');
    }
    return result;
  },
  bulkImportToWordPress: async (formData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to start bulk import');
    }
    return result;
  },
  getBulkImportJob: async (jobId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  deleteBulkImportJob: async (jobId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to delete job');
    }
    return result;
  },
  downloadBulkImportExcel: async (jobId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import/${jobId}/export-excel`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      throw new Error('Failed to download Excel');
    }
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordpress-bulk-import-report-${jobId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  getAllBulkImportJobs: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },
  deleteWordPressPost: async (postId, siteId, wordpressPostId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ siteId, wordpressPostId })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to delete post');
    }
    return result;
  },
  bulkDeleteWordPressPosts: async (siteId, postIds) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/posts/bulk-delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ siteId, postIds })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to bulk delete posts');
    }
    return result;
  },
  getBulkImportReport: async (jobId) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import/${jobId}/report`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to get report');
    }
    return result;
  },
  getAllBulkImportJobs: async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/wordpress/bulk-import`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  },

  // AI Social Content Generation
  generateSocialContent: async (config) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/social/generate-content`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(config),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to generate social content');
    }
    return result;
  },
};
