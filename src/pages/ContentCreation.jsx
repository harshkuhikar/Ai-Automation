/**
 * Content Creation & Publishing Tool
 * @author Harsh J Kuhikar
 * @copyright 2025 Harsh J Kuhikar. All Rights Reserved.
 */

import { useState, useEffect } from 'react'
import { Bold, Italic, List, Link as LinkIcon, Save, Eye, Download, Sparkles, Loader2, Image as ImageIcon, RefreshCw, FileText, Settings, Upload, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import Toast from '../components/Toast'
import ContentGenerationModal from '../components/ContentGenerationModal'
import jsPDF from 'jspdf'
import { Document, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'

export default function ContentCreation() {
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [preview, setPreview] = useState(false)
    const [saved, setSaved] = useState([])
    const [aiLoading, setAiLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const [imageUrls, setImageUrls] = useState([])
    const [selectedImages, setSelectedImages] = useState([])
    const [imageLoading, setImageLoading] = useState(false)
    const [imagePrompts, setImagePrompts] = useState([])
    const [generationStep, setGenerationStep] = useState(0)
    const [generationProgress, setGenerationProgress] = useState('')
    const [showModal, setShowModal] = useState(false)

    // WordPress state
    const [showWordPressModal, setShowWordPressModal] = useState(false)
    const [showBulkImportModal, setShowBulkImportModal] = useState(false)
    const [wordpressSites, setWordPressSites] = useState([])
    const [selectedWordPressSite, setSelectedWordPressSite] = useState(null)
    const [wordpressLoading, setWordpressLoading] = useState(false)
    const [bulkImportFile, setBulkImportFile] = useState(null)
    const [bulkImportJob, setBulkImportJob] = useState(null)
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [pollingInterval, setPollingInterval] = useState(null)

    // Load content from localStorage on mount
    useEffect(() => {
        loadContent()

        // Load persisted content from localStorage
        const savedContent = localStorage.getItem('contentCreation_content')
        const savedTitle = localStorage.getItem('contentCreation_title')
        const savedImages = localStorage.getItem('contentCreation_images')
        const savedSelectedImages = localStorage.getItem('contentCreation_selectedImages')

        if (savedContent) setContent(savedContent)
        if (savedTitle) setTitle(savedTitle)
        if (savedImages) setImageUrls(JSON.parse(savedImages))
        if (savedSelectedImages) setSelectedImages(JSON.parse(savedSelectedImages))

        // Check for ongoing bulk import job after page refresh
        checkForOngoingJob()
    }, [])

    // Cleanup polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval)
            }
        }
    }, [pollingInterval])

    // Save content to localStorage whenever it changes
    useEffect(() => {
        if (content) {
            localStorage.setItem('contentCreation_content', content)
        }
    }, [content])

    useEffect(() => {
        if (title) {
            localStorage.setItem('contentCreation_title', title)
        }
    }, [title])

    useEffect(() => {
        if (imageUrls.length > 0) {
            localStorage.setItem('contentCreation_images', JSON.stringify(imageUrls))
        }
    }, [imageUrls])

    useEffect(() => {
        if (selectedImages.length > 0) {
            localStorage.setItem('contentCreation_selectedImages', JSON.stringify(selectedImages))
        }
    }, [selectedImages])

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
    }

    const loadContent = async () => {
        try {
            const data = await api.getContent()
            if (Array.isArray(data)) {
                setSaved(data.map(item => ({
                    id: item._id,
                    title: item.title,
                    content: item.content,
                    date: new Date(item.createdAt).toLocaleDateString()
                })))
            } else {
                setSaved([])
            }
        } catch (error) {
            console.error('Error loading content:', error)
            setSaved([])
        }
    }

    const clearContent = () => {
        setContent('')
        setTitle('')
        setImageUrls([])
        setSelectedImages([])
        setImagePrompts([])
        localStorage.removeItem('contentCreation_content')
        localStorage.removeItem('contentCreation_title')
        localStorage.removeItem('contentCreation_images')
        localStorage.removeItem('contentCreation_selectedImages')
        showToast('Content cleared', 'success')
    }

    // WordPress State
    const [wpSiteName, setWpSiteName] = useState('')
    const [wpSiteUrl, setWpSiteUrl] = useState('')
    const [wpUsername, setWpUsername] = useState('')
    const [wpPassword, setWpPassword] = useState('')
    const [wpTestLoading, setWpTestLoading] = useState(false)

    // WordPress Functions
    const loadWordPressSites = async () => {
        try {
            const sites = await api.getWordPressSites()
            if (Array.isArray(sites)) {
                setWordPressSites(sites)
                if (sites.length > 0) {
                    setSelectedWordPressSite(sites[0]._id)
                }
            } else {
                setWordPressSites([])
            }
        } catch (error) {
            console.error('Error loading WordPress sites:', error)
            setWordPressSites([])
        }
    }

    const testWordPressConnection = async () => {
        if (!wpSiteUrl || !wpUsername || !wpPassword) {
            showToast('Please fill all fields', 'warning')
            return
        }

        setWpTestLoading(true)
        try {
            const result = await api.testWordPressSite({
                siteUrl: wpSiteUrl,
                username: wpUsername,
                applicationPassword: wpPassword
            })

            if (result.success) {
                showToast(`✅ Connected! Site: ${result.siteName}`, 'success')
            }
        } catch (error) {
            showToast(error.message || 'Connection failed', 'error')
        } finally {
            setWpTestLoading(false)
        }
    }

    const addWordPressSite = async () => {
        if (!wpSiteName || !wpSiteUrl || !wpUsername || !wpPassword) {
            showToast('Please fill all fields', 'warning')
            return
        }

        setWordpressLoading(true)
        try {
            const result = await api.addWordPressSite({
                siteName: wpSiteName,
                siteUrl: wpSiteUrl,
                username: wpUsername,
                applicationPassword: wpPassword
            })

            if (result.success) {
                showToast('✅ WordPress site added!', 'success')
                setWpSiteName('')
                setWpSiteUrl('')
                setWpUsername('')
                setWpPassword('')
                await loadWordPressSites()
            }
        } catch (error) {
            showToast(error.message || 'Failed to add site', 'error')
        } finally {
            setWordpressLoading(false)
        }
    }

    const deleteWordPressSite = async (siteId) => {
        if (!confirm('Are you sure you want to remove this WordPress site?')) return

        try {
            await api.deleteWordPressSite(siteId)
            showToast('Site removed', 'success')
            await loadWordPressSites()
        } catch (error) {
            showToast('Failed to remove site', 'error')
        }
    }

    const publishToWordPress = async () => {
        if (!selectedWordPressSite) {
            showToast('Please select a WordPress site', 'warning')
            return
        }

        if (!title || !content) {
            showToast('Please generate content first', 'warning')
            return
        }

        setWordpressLoading(true)
        try {
            const images = imageUrls.map((url, index) => ({
                url,
                alt: imagePrompts[index] || title
            }))

            const result = await api.publishToWordPress({
                siteId: selectedWordPressSite,
                title,
                content,
                images
            })

            if (result.success) {
                showToast(`✅ Published! ${result.uploadedImages} images uploaded`, 'success')
                setShowPublishModal(false)
                if (result.postUrl) {
                    window.open(result.postUrl, '_blank')
                }
            }
        } catch (error) {
            showToast(error.message || 'Failed to publish', 'error')
        } finally {
            setWordpressLoading(false)
        }
    }

    const handleBulkImport = async () => {
        if (!selectedWordPressSite) {
            showToast('Please select a WordPress site', 'warning')
            return
        }

        if (!bulkImportFile) {
            showToast('Please select an Excel file', 'warning')
            return
        }

        setWordpressLoading(true)
        try {
            const formData = new FormData()
            formData.append('excel', bulkImportFile)
            formData.append('siteId', selectedWordPressSite)

            const result = await api.bulkImportToWordPress(formData)

            if (result.success) {
                showToast(`✅ Started processing ${result.totalPosts} posts!`, 'success')
                setBulkImportJob(result)
                pollBulkImportProgress(result.jobId)
            }
        } catch (error) {
            showToast(error.message || 'Failed to start bulk import', 'error')
        } finally {
            setWordpressLoading(false)
        }
    }

    // Check for ongoing job after page refresh
    const checkForOngoingJob = async () => {
        const savedJobId = localStorage.getItem('bulkImportJobId')
        if (savedJobId) {
            try {
                const job = await api.getBulkImportJob(savedJobId)

                // If job is still processing, resume tracking
                if (job.status === 'processing' || job.status === 'pending') {
                    console.log('[RESUME] Found ongoing job:', savedJobId)
                    setBulkImportJob(job)
                    setShowBulkImportModal(true)
                    showToast('📋 Resumed tracking bulk import job', 'info')
                    pollBulkImportProgress(savedJobId)
                } else if (job.status === 'completed') {
                    // Job completed while user was away
                    setBulkImportJob(job)
                    showToast(`✅ Job completed! ${job.successfulPosts}/${job.totalPosts} posts published`, 'success')
                    localStorage.removeItem('bulkImportJobId')
                } else {
                    // Job failed or other status
                    localStorage.removeItem('bulkImportJobId')
                }
            } catch (error) {
                console.error('[RESUME] Error checking job:', error)
                localStorage.removeItem('bulkImportJobId')
            }
        }
    }

    const pollBulkImportProgress = async (jobId) => {
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval)
        }

        // Save job ID to localStorage for persistence across refreshes
        localStorage.setItem('bulkImportJobId', jobId)

        const interval = setInterval(async () => {
            try {
                const job = await api.getBulkImportJob(jobId)
                setBulkImportJob(job)

                if (job.status === 'completed' || job.status === 'failed') {
                    clearInterval(interval)
                    setPollingInterval(null)
                    localStorage.removeItem('bulkImportJobId')

                    if (job.status === 'completed') {
                        showToast(`✅ Completed! ${job.successfulPosts}/${job.totalPosts} posts published`, 'success')
                    } else {
                        showToast('❌ Bulk import failed', 'error')
                    }
                }
            } catch (error) {
                console.error('[POLLING] Error:', error)
                // Don't clear interval on network error - keep trying
                // Only clear if job not found (404)
                if (error.message && error.message.includes('404')) {
                    clearInterval(interval)
                    setPollingInterval(null)
                    localStorage.removeItem('bulkImportJobId')
                }
            }
        }, 3000) // Poll every 3 seconds

        setPollingInterval(interval)
    }

    useEffect(() => {
        loadWordPressSites()
    }, [])

    const generateFromScratch = async (config) => {
        // Clear previous content before generating new
        clearContent()

        setAiLoading(true)
        setGenerationStep(1)

        try {
            // SINGLE STEP: Generate 100% HUMAN content with high-quality images
            setGenerationProgress('Generating 100% human content with high-quality images...')
            showToast('✨ Generating truly human content...', 'info')

            // SINGLE STEP - Call Python to generate 100% human content
            const result = await api.generateHumanContent(config)

            setTitle(result.title || config.topic)

            // DEBUG: Check if content has images
            console.log('[CONTENT] Content length:', result.content.length)
            console.log('[CONTENT] Has image markdown:', result.content.includes('!['))
            console.log('[CONTENT] Number of images in markdown:', (result.content.match(/!\[/g) || []).length)

            setContent(result.content)

            // Set high-quality images from Pexels
            if (result.images && result.images.length > 0) {
                console.log('[CONTENT] Received', result.images.length, 'image objects')
                const imageUrls = result.images.map(img => img.url)
                const imageAlts = result.images.map(img => img.alt)
                setImageUrls(imageUrls)
                setImagePrompts(imageAlts)
                setSelectedImages(imageUrls)
            }

            setGenerationStep(0)
            setGenerationProgress('')
            showToast('✅ Complete! 100% human content ready!', 'success')

        } catch (error) {
            console.error('Content generation error:', error)
            const errorMessage = error.message || 'An unexpected error occurred, please retry.'
            showToast(errorMessage, 'error')
            setGenerationStep(0)
            setGenerationProgress('')
        } finally {
            setAiLoading(false)
        }
    }

    // Keep this for backup/manual use
    const oldGenerateFromScratch = async (config) => {
        const { topic, wordCount, numImages, tone, targetAudience, includeStats } = config

        setAiLoading(true)
        setGenerationStep(1)

        try {
            const step1Prompt = `Write a comprehensive, well-researched article about: "${topic}". 

Structure:
1. An engaging introduction that hooks the reader
2. 5 to 7 main sections with detailed explanations
3. Real-world examples and case studies
${includeStats ? '4. Statistics and data points (use realistic numbers)' : ''}
5. Actionable tips and best practices
6. A strong conclusion

Requirements:
→ Make it exactly ${wordCount} words (target length)
→ Use proper headings for each section
→ Include paragraphs with varied lengths
→ Add specific examples and real scenarios
${includeStats ? '→ Use statistics to support your points' : ''}
→ Writing tone: ${tone}
→ Target audience: ${targetAudience}
→ Keep the content engaging and valuable

Write the full article now.`

            const step1Result = await api.generateContent(step1Prompt)
            setTitle(topic)
            setContent(step1Result.content)
            setGenerationStep(2)

            // Wait 2 seconds to show the AI content
            await new Promise(resolve => setTimeout(resolve, 2000))

            // STEP 2: Humanize the content
            setGenerationProgress('Step 2/3: Making it sound human-written...')
            showToast('✍️ Step 2: Humanizing content...', 'info')

            const step2Prompt = `CRITICAL INSTRUCTION: Write the content in a completely human style. Avoid patterns that AI usually produces. Make it sound natural, emotional, conversational, and slightly imperfect like a real person wrote it. Do not use robotic structure, repetitive phrasing, or over-polished sentences.

YOUR MISSION: Rewrite the text below so it scores 100% human written and 0% AI generated.

MANDATORY RULES FOR HUMAN-LIKE WRITING:

1. NATURAL FLOW
Write like you're talking to a friend over coffee. Not writing an essay. Just sharing thoughts. Some sentences can be fragments. Others longer with multiple ideas flowing together because that's how people actually think and write when they're not trying to be perfect.

2. HUMAN IMPERFECTIONS
Add small natural touches. Maybe start a sentence with "And" or "But" or "So". Use contractions everywhere (don't, can't, won't, it's, that's). Throw in casual phrases like "you know", "I mean", "honestly", "look", "here's the thing". Real people do this.

3. EMOTIONAL & PERSONAL TONE
Write like you've experienced this stuff. Add opinions. Say things like "I think", "in my experience", "what I've noticed". Show some personality. Get a bit passionate about certain points. Real humans care about what they write.

4. VARIED SENTENCE RHYTHM
Mix it up. Short punchy sentences. Then longer ones that flow and connect multiple thoughts together naturally. Then back to short. This creates rhythm. AI loves uniform length. Humans don't.

5. NATURAL VOCABULARY
Use everyday words. Not fancy ones. Say "use" not "utilize". Say "help" not "facilitate". Say "buy" not "purchase". Throw in some casual expressions. Real people don't talk like textbooks.

6. AVOID AI PATTERNS
NEVER use these AI giveaways:
- "delve into" / "dive into" / "explore"
- "landscape" (as in business landscape)
- "robust" / "comprehensive" / "leverage"
- "it's important to note" / "it's worth mentioning"
- "in conclusion" / "in summary" / "to summarize"
- "game-changing" / "cutting-edge" / "revolutionary"
- "seamless" / "streamline" / "optimize"
- Perfect parallel structure in lists
- Overly balanced sentences
- Too many transition words

7. BREAK THE RULES SOMETIMES
Real humans make small grammar mistakes. Start sentences with conjunctions. End with prepositions. Use sentence fragments for emphasis. Like this. See?

8. ADD REAL-LIFE CONTEXT
Mention real situations. "When I tried this last month..." or "My friend does this and..." or "You've probably seen this happen...". Make it feel lived-in.

9. NATURAL TRANSITIONS
Don't use formal transitions. Instead of "Furthermore" say "Plus" or "And another thing". Instead of "However" say "But" or "Though". Instead of "Therefore" say "So". Real people talk this way.

10. CONVERSATIONAL STRUCTURE
Don't organize too perfectly. Real writing meanders a bit. You might circle back to a point. Or add a side thought in parentheses (like this). Or use em dashes to add extra info. Mix it up.

11. SHOW UNCERTAINTY SOMETIMES
Real humans aren't always 100% sure. Say things like "probably", "might", "could be", "from what I've seen", "seems like". AI is too confident. Humans hedge a bit.

12. USE ACTIVE VOICE & DIRECT ADDRESS
Say "you can do this" not "this can be done". Talk directly to the reader. Use "you" and "your" a lot. Make it feel like a conversation.

ABSOLUTE PROHIBITIONS:
❌ No dashes or hyphens in sentences
❌ No colons except in time or titles
❌ No rhetorical questions
❌ No "X and also Y" structures
❌ No words like: basically, clearly, obviously, essentially, literally, actually (when used as filler)
❌ No fake enthusiasm or hype
❌ No marketing speak
❌ No perfect symmetry in structure
❌ No overly formal language

FINAL INSTRUCTION:
Take the content below and completely rewrite it as if you're a real human who knows this topic well and is just explaining it naturally to someone. Keep all the facts and information but make the writing style completely human. Imperfect. Natural. Conversational. Emotional. Real.

The goal is 0% AI detection. Write like a human who's passionate about the topic but not trying to sound professional or perfect.

CONTENT TO REWRITE:
${step1Result.content}

NOW REWRITE THIS TO BE 100% HUMAN. Make it natural, imperfect, conversational, and completely undetectable as AI.`

            // Use Python humanization for 0% AI detection
            const step2Result = await api.humanizeContent(step1Result.content)
            setContent(step2Result.content)
            setGenerationStep(3)

            // Wait 2 seconds to show the humanized content
            await new Promise(resolve => setTimeout(resolve, 2000))

            // STEP 3: Generate images and auto-insert them
            setGenerationProgress('Step 3/3: Generating and inserting images...')
            showToast('🎨 Step 3: Generating images...', 'info')

            await generateAndInsertImages(step2Result.content, topic, parseInt(numImages))

            setGenerationStep(0)
            setGenerationProgress('')
            showToast('✅ Complete! Content is 100% ready!', 'success')

        } catch (error) {
            console.error('AI generation error:', error)
            showToast('Error generating content. Please try again.', 'error')
            setGenerationStep(0)
            setGenerationProgress('')
        } finally {
            setAiLoading(false)
        }
    }

    const generateAndInsertImages = async (contentText, topic, numImages = 4) => {
        setImageLoading(true)
        try {
            // Use Python to get REAL images from Google
            const imageResult = await api.searchRealImages(contentText, topic, numImages)
            const realImages = imageResult.images || []

            // Extract prompts/titles from images
            const prompts = realImages.map(img => img.title || topic)
            setImagePrompts(prompts)

            // Get image URLs
            const generatedImages = realImages.map(img => img.url)
            setImageUrls(generatedImages)

            // Auto-insert images into content at strategic positions
            const paragraphs = contentText.split('\n\n')
            const step = 1 / (numImages + 1)
            const insertPositions = Array.from({ length: numImages }, (_, i) =>
                Math.floor(paragraphs.length * step * (i + 1))
            )

            let newContent = contentText
            let insertedImages = []

            for (let i = 0; i < generatedImages.length && i < insertPositions.length; i++) {
                const imageUrl = generatedImages[i]
                const caption = prompts[i]
                const imageMarkdown = `\n\n![${caption}](${imageUrl})\n*${caption}*\n\n`

                // Find the position in the full text
                const paragraphIndex = insertPositions[i]
                const beforeParagraphs = paragraphs.slice(0, paragraphIndex).join('\n\n')
                const afterParagraphs = paragraphs.slice(paragraphIndex).join('\n\n')

                newContent = beforeParagraphs + imageMarkdown + afterParagraphs
                paragraphs.splice(paragraphIndex, 0, imageMarkdown.trim())
                insertedImages.push(imageUrl)
            }

            setContent(newContent)
            setSelectedImages(insertedImages)

        } catch (error) {
            console.error('Error generating AI images:', error)
            generateFallbackImages(topic)
        } finally {
            setImageLoading(false)
        }
    }

    const improveContent = async () => {
        if (!content.trim()) {
            showToast('Please write some content first!', 'warning')
            return
        }

        setAiLoading(true)
        try {
            const promptText = `Improve and enhance this content to make it more engaging, professional, and comprehensive:

${content}

Make it:
- More detailed and informative
- Better structured with clear sections
- Include relevant examples
- Add statistics and data points
- More engaging and readable
- SEO-optimized
- At least 50% longer with valuable information`

            const result = await api.generateContent(promptText)
            setContent(result.content)
            showToast('✨ Content improved successfully!', 'success')
        } catch (error) {
            console.error('AI generation error:', error)
            showToast('Error improving content. Please try again.', 'error')
        } finally {
            setAiLoading(false)
        }
    }

    const generateAIImages = async (contentText, topic) => {
        setImageLoading(true)
        try {
            // Analyze content to extract key visual concepts
            const analysisPrompt = `Analyze this content and suggest 4 specific, detailed image descriptions that would perfectly illustrate the key concepts. Each description should be vivid, specific, and suitable for AI image generation.

Content: "${contentText.substring(0, 1000)}..."

Provide 4 image descriptions in this exact format:
1. [First detailed image description]
2. [Second detailed image description]
3. [Third detailed image description]
4. [Fourth detailed image description]

Make each description specific, visual, and relevant to the content's main points.`

            const analysisResult = await api.generateContent(analysisPrompt)

            // Extract image prompts from the analysis
            const prompts = extractImagePrompts(analysisResult.content)
            setImagePrompts(prompts)

            // Generate images using Pollinations AI (free, no API key needed)
            const generatedImages = prompts.map((prompt, index) => {
                const encodedPrompt = encodeURIComponent(prompt)
                return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&seed=${Date.now() + index}&nologo=true`
            })

            setImageUrls(generatedImages)
            showToast('🎨 AI images generated successfully!', 'success')
        } catch (error) {
            console.error('Error generating AI images:', error)
            // Fallback to topic-based images
            generateFallbackImages(topic)
            showToast('Generated fallback images', 'info')
        } finally {
            setImageLoading(false)
        }
    }

    const extractImagePrompts = (analysisText) => {
        // Extract numbered descriptions from AI response
        const lines = analysisText.split('\n')
        const prompts = []

        for (const line of lines) {
            const match = line.match(/^\d+\.\s*(.+)/)
            if (match && match[1]) {
                prompts.push(match[1].trim())
            }
        }

        // If extraction failed, create generic prompts
        if (prompts.length < 4) {
            return [
                'Professional business concept with modern design, high quality, detailed',
                'Technology and innovation theme, futuristic, clean aesthetic',
                'Team collaboration and success, professional environment',
                'Growth and progress visualization, inspiring, motivational'
            ]
        }

        return prompts.slice(0, 4)
    }

    const generateFallbackImages = (topic) => {
        const randomSeed = Date.now()
        const suggestions = [
            `https://picsum.photos/800/600?random=${randomSeed}`,
            `https://picsum.photos/800/600?random=${randomSeed + 1}`,
            `https://picsum.photos/800/600?random=${randomSeed + 2}`,
            `https://picsum.photos/800/600?random=${randomSeed + 3}`,
        ]
        setImageUrls(suggestions)
        setImagePrompts([
            `${topic} - Image 1`,
            `${topic} - Image 2`,
            `${topic} - Image 3`,
            `${topic} - Image 4`
        ])
    }

    const regenerateImages = async () => {
        if (!content.trim() && !title.trim()) {
            showToast('Please add content or title first', 'warning')
            return
        }
        await generateAIImages(content || title, title || 'content')
    }

    const insertImage = (imageUrl, index) => {
        const caption = imagePrompts[index] || 'Generated Image'
        const imageMarkdown = `\n\n![${caption}](${imageUrl})\n*${caption}*\n\n`
        setContent(content + imageMarkdown)
        setSelectedImages([...selectedImages, imageUrl])
        showToast('✅ Image inserted into content', 'success')
    }

    const downloadImage = async (imageUrl, index) => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ai-image-${index + 1}.png`
            a.click()
            URL.revokeObjectURL(url)
            showToast('📥 Image downloaded!', 'success')
        } catch (error) {
            console.error('Error downloading image:', error)
            showToast('Error downloading image', 'error')
        }
    }

    const saveDraft = async () => {
        if (!title.trim() && !content.trim()) {
            showToast('Please add a title or content first', 'warning')
            return
        }

        try {
            const newContent = await api.saveContent({ title: title || 'Untitled', content })
            setSaved([{
                id: newContent._id,
                title: newContent.title,
                content: newContent.content,
                date: new Date(newContent.createdAt).toLocaleDateString()
            }, ...saved])
            showToast('✅ Draft saved successfully!', 'success')
        } catch (error) {
            console.error('Error saving content:', error)
            showToast('Error saving draft. Please try again.', 'error')
        }
    }

    const downloadContent = () => {
        if (!content.trim()) {
            showToast('No content to download', 'warning')
            return
        }

        const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${title || 'content'}.md`
        a.click()
        showToast('📥 Content downloaded as Markdown!', 'success')
    }

    const downloadAsPDF = async () => {
        if (!content.trim()) {
            showToast('No content to download', 'warning')
            return
        }

        try {
            console.log('[PDF] ===== STARTING PDF GENERATION =====')
            console.log('[PDF] Content length:', content.length)
            console.log('[PDF] Content first 300 chars:', content.substring(0, 300))
            console.log('[PDF] Title:', title)

            showToast('📄 Preparing images...', 'info')

            // PRE-DOWNLOAD ALL IMAGES FIRST
            const imageMatches = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]
            const imageCache = {}

            console.log(`[PDF] Found ${imageMatches.length} images to download`)
            console.log('[PDF] Image matches:', imageMatches.map(m => m[2]))

            for (const match of imageMatches) {
                const imageUrl = match[2]
                try {
                    console.log(`[PDF] Pre-downloading: ${imageUrl}`)
                    const imgData = await loadImageAsBase64(imageUrl)
                    imageCache[imageUrl] = imgData
                    console.log(`[PDF] Cached: ${imageUrl}`)
                } catch (error) {
                    console.error(`[PDF] Failed to cache: ${imageUrl}`, error)
                    imageCache[imageUrl] = null
                }
            }

            console.log(`[PDF] Cached ${Object.keys(imageCache).length} images`)
            showToast('📄 Generating PDF...', 'info')

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)
            let yPosition = margin

            // Header with gradient effect (simulated with rectangles)
            pdf.setFillColor(147, 51, 234) // Purple
            pdf.rect(0, 0, pageWidth, 40, 'F')

            // Company/Author name
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(12)
            pdf.text('Harsh J Kuhikar', margin, 15)

            // Title
            pdf.setFontSize(24)
            pdf.setFont('helvetica', 'bold')
            const titleLines = pdf.splitTextToSize(title || 'Untitled Document', contentWidth)
            pdf.text(titleLines, margin, 30)

            yPosition = 50

            // Date and metadata
            pdf.setFontSize(10)
            pdf.setTextColor(100, 100, 100)
            pdf.setFont('helvetica', 'normal')
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            pdf.text(`Generated on: ${currentDate}`, margin, yPosition)
            yPosition += 10

            // Separator line
            pdf.setDrawColor(147, 51, 234)
            pdf.setLineWidth(0.5)
            pdf.line(margin, yPosition, pageWidth - margin, yPosition)
            yPosition += 10

            // Content processing
            pdf.setTextColor(0, 0, 0)
            pdf.setFontSize(11)
            pdf.setFont('helvetica', 'normal')

            // Split content into paragraphs and process
            const paragraphs = content.split('\n\n')
            console.log(`[PDF] Processing ${paragraphs.length} paragraphs`)

            for (let i = 0; i < paragraphs.length; i++) {
                let paragraph = paragraphs[i].trim()
                if (!paragraph) continue

                console.log(`[PDF] Paragraph ${i}: ${paragraph.substring(0, 100)}...`)

                // Check if it's an image markdown
                const imageMatch = paragraph.match(/!\[([^\]]*)\]\(([^)]+)\)/)
                if (imageMatch) {
                    const imageCaption = imageMatch[1]
                    const imageUrl = imageMatch[2]

                    console.log(`[PDF] Found image: ${imageUrl}`)

                    // Add space before image
                    yPosition += 5

                    // Check if we need a new page
                    if (yPosition + 80 > pageHeight - margin) {
                        pdf.addPage()
                        yPosition = margin
                    }

                    // Use pre-downloaded image from cache
                    const imgData = imageCache[imageUrl]

                    if (imgData) {
                        try {
                            console.log('[PDF] Adding cached image to PDF')
                            pdf.addImage(imgData, 'JPEG', margin, yPosition, contentWidth, 60)
                            yPosition += 65
                            console.log('[PDF] Image added successfully')
                        } catch (error) {
                            console.error('[PDF] Failed to add image to PDF:', error)
                            pdf.setFontSize(9)
                            pdf.setTextColor(150, 150, 150)
                            pdf.text(`[Image: ${imageCaption || 'Image'}]`, margin, yPosition)
                            yPosition += 5
                            pdf.setFontSize(11)
                            pdf.setTextColor(0, 0, 0)
                        }
                    } else {
                        console.warn('[PDF] Image not in cache:', imageUrl)
                        pdf.setFontSize(9)
                        pdf.setTextColor(150, 150, 150)
                        pdf.text(`[Image: ${imageCaption || 'Image'}]`, margin, yPosition)
                        yPosition += 5
                        pdf.setFontSize(11)
                        pdf.setTextColor(0, 0, 0)
                    }

                    yPosition += 5

                    // IMPORTANT: Check if there's text after the image in the same paragraph
                    const textAfterImage = paragraph.replace(/!\[([^\]]*)\]\(([^)]+)\)/, '').trim()
                    if (textAfterImage) {
                        console.log(`[PDF] Text after image: ${textAfterImage.substring(0, 50)}...`)
                        paragraph = textAfterImage
                        // Continue processing this text below
                    } else {
                        continue
                    }
                }

                // Check if it's a heading (starts with # or is all caps and short)
                const isHeading = paragraph.startsWith('#') ||
                    (paragraph.length < 100 && paragraph === paragraph.toUpperCase())

                if (isHeading) {
                    yPosition += 5
                    pdf.setFont('helvetica', 'bold')
                    pdf.setFontSize(14)
                    pdf.setTextColor(147, 51, 234)
                    const headingText = paragraph.replace(/^#+\s*/, '')
                    const headingLines = pdf.splitTextToSize(headingText, contentWidth)

                    // Check if we need a new page
                    if (yPosition + (headingLines.length * 7) > pageHeight - margin) {
                        pdf.addPage()
                        yPosition = margin
                    }

                    pdf.text(headingLines, margin, yPosition)
                    yPosition += headingLines.length * 7 + 3
                    pdf.setFont('helvetica', 'normal')
                    pdf.setFontSize(11)
                    pdf.setTextColor(0, 0, 0)
                } else {
                    // Regular paragraph - clean any remaining markdown
                    paragraph = paragraph.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '').trim()

                    if (paragraph) {
                        const lines = pdf.splitTextToSize(paragraph, contentWidth)

                        // Check if we need a new page
                        if (yPosition + (lines.length * 6) > pageHeight - margin) {
                            pdf.addPage()
                            yPosition = margin
                        }

                        pdf.text(lines, margin, yPosition)
                        yPosition += lines.length * 6 + 5
                        console.log(`[PDF] Added text paragraph, new yPosition: ${yPosition}`)
                    }
                }
            }

            console.log(`[PDF] Finished processing all paragraphs`)

            // Footer on last page
            const totalPages = pdf.internal.pages.length - 1
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i)
                pdf.setFontSize(8)
                pdf.setTextColor(150, 150, 150)
                pdf.text(
                    `Page ${i} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                )
                pdf.text(
                    '© 2025 Harsh J Kuhikar - All Rights Reserved',
                    pageWidth / 2,
                    pageHeight - 5,
                    { align: 'center' }
                )
            }

            // Save the PDF
            const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'content'}.pdf`
            pdf.save(fileName)

            showToast('📄 PDF downloaded successfully!', 'success')
        } catch (error) {
            console.error('Error generating PDF:', error)
            showToast('Error generating PDF. Please try again.', 'error')
        }
    }

    const loadImageAsBase64 = async (url) => {
        try {
            console.log('[IMAGE LOADER] Loading image:', url)
            // Use backend proxy to avoid CORS issues
            const apiBase = import.meta.env.PROD
                ? 'https://ai-automation-production-c35e.up.railway.app/api'
                : 'http://localhost:3001/api'
            const proxyUrl = `${apiBase}/proxy-image?url=${encodeURIComponent(url)}`
            console.log('[IMAGE LOADER] Using proxy:', proxyUrl)

            const response = await fetch(proxyUrl)
            console.log('[IMAGE LOADER] Proxy response status:', response.status)

            if (!response.ok) {
                throw new Error(`Failed to load image: ${response.status} ${response.statusText}`)
            }

            const blob = await response.blob()
            console.log('[IMAGE LOADER] Blob size:', blob.size, 'bytes')

            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => {
                    console.log('[IMAGE LOADER] Image converted to base64')
                    resolve(reader.result)
                }
                reader.onerror = (error) => {
                    console.error('[IMAGE LOADER] FileReader error:', error)
                    reject(error)
                }
                reader.readAsDataURL(blob)
            })
        } catch (error) {
            console.error('[IMAGE LOADER] Error loading image:', error)
            throw error
        }
    }

    const loadImageAsArrayBuffer = async (url) => {
        try {
            // Use backend proxy to avoid CORS issues
            const apiBase = import.meta.env.PROD
                ? 'https://ai-automation-production-c35e.up.railway.app/api'
                : 'http://localhost:3001/api'
            const proxyUrl = `${apiBase}/proxy-image?url=${encodeURIComponent(url)}`

            const response = await fetch(proxyUrl)
            if (!response.ok) throw new Error('Failed to load image')

            const blob = await response.blob()
            return await blob.arrayBuffer()
        } catch (error) {
            console.error('Error loading image:', error)
            return null
        }
    }

    const loadImageViaCanvas = async (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const buffer = await blob.arrayBuffer()
                        resolve(buffer)
                    } else {
                        reject(new Error('Failed to convert to blob'))
                    }
                }, 'image/png')
            }
            img.onerror = reject
            img.src = url
        })
    }

    const downloadAsWord = async () => {
        if (!content.trim()) {
            showToast('No content to download', 'warning')
            return
        }

        try {
            showToast('📄 Preparing images...', 'info')

            // PRE-DOWNLOAD ALL IMAGES FIRST
            const imageMatches = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)]
            const imageBufferCache = {}

            console.log(`[WORD] Found ${imageMatches.length} images to download`)

            for (const match of imageMatches) {
                const imageUrl = match[2]
                try {
                    console.log(`[WORD] Pre-downloading: ${imageUrl}`)
                    const buffer = await loadImageAsArrayBuffer(imageUrl)
                    imageBufferCache[imageUrl] = buffer
                    console.log(`[WORD] Cached: ${imageUrl}`)
                } catch (error) {
                    console.error(`[WORD] Failed to cache: ${imageUrl}`, error)
                    imageBufferCache[imageUrl] = null
                }
            }

            console.log(`[WORD] Cached ${Object.keys(imageBufferCache).length} images`)
            showToast('📄 Generating Word document...', 'info')

            const docChildren = []

            // Add title
            docChildren.push(
                new Paragraph({
                    text: title || 'Untitled Document',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            )

            // Add metadata
            const currentDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `By: Harsh J Kuhikar | Generated on: ${currentDate}`,
                            size: 20,
                            color: '666666'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            )

            // Add separator
            docChildren.push(
                new Paragraph({
                    text: '_______________________________________________',
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            )

            // Process content
            const paragraphs = content.split('\n\n')

            for (let i = 0; i < paragraphs.length; i++) {
                const paragraph = paragraphs[i].trim()
                if (!paragraph) continue

                // Check if it's an image markdown
                const imageMatch = paragraph.match(/!\[([^\]]*)\]\(([^)]+)\)/)
                if (imageMatch) {
                    const imageCaption = imageMatch[1]
                    const imageUrl = imageMatch[2]

                    // Use pre-downloaded image from cache
                    const imageBuffer = imageBufferCache[imageUrl]

                    if (imageBuffer) {
                        try {
                            console.log('[WORD] Adding cached image')
                            docChildren.push(
                                new Paragraph({
                                    children: [
                                        new ImageRun({
                                            data: imageBuffer,
                                            transformation: {
                                                width: 500,
                                                height: 375
                                            }
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { before: 200, after: 100 }
                                })
                            )
                            console.log('[WORD] Image added successfully')
                        } catch (error) {
                            console.error('[WORD] Error adding image:', error)
                            // Add placeholder text if image fails
                            docChildren.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `[Image: ${imageCaption || 'Image'}]`,
                                            color: '999999'
                                        })
                                    ],
                                    spacing: { after: 200 }
                                })
                            )
                        }
                    } else {
                        console.warn('[WORD] Image not in cache:', imageUrl)
                        docChildren.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `[Image: ${imageCaption || 'Image'}]`,
                                        color: '999999'
                                    })
                                ],
                                spacing: { after: 200 }
                            })
                        )
                    }
                    continue
                }

                // Check if it's a heading
                const isHeading = paragraph.startsWith('#') ||
                    (paragraph.length < 100 && paragraph === paragraph.toUpperCase())

                if (isHeading) {
                    const headingText = paragraph.replace(/^#+\s*/, '')
                    docChildren.push(
                        new Paragraph({
                            text: headingText,
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 300, after: 200 }
                        })
                    )
                } else {
                    // Regular paragraph
                    docChildren.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: paragraph,
                                    size: 24
                                })
                            ],
                            spacing: { after: 200 }
                        })
                    )
                }
            }

            // Add footer
            docChildren.push(
                new Paragraph({
                    text: '',
                    spacing: { before: 400 }
                })
            )
            docChildren.push(
                new Paragraph({
                    text: '_______________________________________________',
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                })
            )
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '© 2025 Harsh J Kuhikar - All Rights Reserved',
                            size: 20,
                            color: '666666'
                        })
                    ],
                    alignment: AlignmentType.CENTER
                })
            )

            // Create document
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docChildren
                }]
            })

            // Generate and save
            const blob = await Packer.toBlob(doc)
            const fileName = `${(title || 'content').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`
            saveAs(blob, fileName)

            showToast('📄 Word document downloaded successfully!', 'success')
        } catch (error) {
            console.error('Error generating Word document:', error)
            showToast('Error generating Word document. Please try again.', 'error')
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Content Generation Modal */}
            <ContentGenerationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onGenerate={generateFromScratch}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Background Job Indicator */}
            {bulkImportJob && bulkImportJob.status === 'processing' && !showBulkImportModal && (
                <div className="mb-6 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" size={24} />
                        <div>
                            <p className="font-bold text-lg">✅ Bulk Import Running in Background</p>
                            <p className="text-sm opacity-90">
                                {bulkImportJob.processedPosts} / {bulkImportJob.totalPosts} posts processed •
                                {bulkImportJob.successfulPosts} successful •
                                {bulkImportJob.failedPosts} failed
                            </p>
                            <p className="text-xs opacity-75 mt-1">
                                {bulkImportJob.currentStep || 'Processing...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBulkImportModal(true)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                    >
                        View Progress
                    </button>
                </div>
            )}

            <h1 className="text-3xl font-bold mb-2">Content Creation & Publishing</h1>
            <p className="text-gray-600 mb-8">Create rich, well-researched content with AI assistance (Google AI)</p>

            <div className="grid lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <input
                            type="text"
                            placeholder="Content Title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full text-2xl font-bold mb-4 px-2 py-1 border-b focus:outline-none focus:border-blue-600"
                        />

                        <div className="flex gap-2 mb-4 pb-4 border-b flex-wrap">
                            <button className="p-2 hover:bg-gray-100 rounded" title="Bold">
                                <Bold size={18} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded" title="Italic">
                                <Italic size={18} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded" title="List">
                                <List size={18} />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded" title="Link">
                                <LinkIcon size={18} />
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={() => setShowModal(true)}
                                disabled={aiLoading}
                                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                            >
                                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                AI Generate
                            </button>
                            <button
                                onClick={improveContent}
                                disabled={aiLoading || !content}
                                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded hover:from-green-700 hover:to-teal-700 disabled:opacity-50"
                            >
                                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                AI Improve
                            </button>
                            {content && (
                                <button
                                    onClick={clearContent}
                                    disabled={aiLoading}
                                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                    title="Clear all content"
                                >
                                    <FileText size={16} />
                                    Clear
                                </button>
                            )}
                            <div className="flex-1" />
                            <button
                                onClick={() => setShowWordPressModal(true)}
                                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded hover:from-blue-700 hover:to-cyan-700"
                                title="WordPress Settings"
                            >
                                <Settings size={16} />
                                WordPress
                            </button>
                            {content && title && (
                                <button
                                    onClick={() => setShowPublishModal(true)}
                                    disabled={wordpressLoading || wordpressSites.length === 0}
                                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                                    title="Publish to WordPress"
                                >
                                    <ExternalLink size={16} />
                                    Publish
                                </button>
                            )}
                            <button
                                onClick={() => setShowBulkImportModal(true)}
                                disabled={wordpressSites.length === 0}
                                className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                                title="Bulk Import from Excel"
                            >
                                <Upload size={16} />
                                Bulk Import
                            </button>
                        </div>

                        {!preview ? (
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Start writing your content or use AI Generate to create comprehensive articles with research, examples, and statistics..."
                                className="w-full h-[500px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                            />
                        ) : (
                            <div className="prose max-w-none p-4 border rounded-md h-[500px] overflow-auto">
                                <h1>{title}</h1>
                                <div
                                    className="whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{
                                        __html: content
                                            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full max-w-3xl mx-auto my-6 rounded-lg shadow-lg" style="max-height: 400px; object-fit: contain;" />')
                                            .replace(/\n/g, '<br />')
                                    }}
                                />
                            </div>
                        )}

                        {/* Image Gallery */}
                        {imageUrls.length > 0 && !preview && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">📸 Images in Content ({imageUrls.length})</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {imageUrls.map((url, i) => (
                                        <div key={i} className="relative group">
                                            <img
                                                src={url}
                                                alt={imagePrompts[i] || `Image ${i + 1}`}
                                                className="w-full h-24 object-cover rounded border"
                                                onError={(e) => {
                                                    e.target.src = `https://picsum.photos/200/150?random=${i}`
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                                <span className="text-white text-xs text-center px-2">{imagePrompts[i]}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-4 flex-wrap">
                            <button
                                onClick={() => setPreview(!preview)}
                                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                            >
                                <Eye size={16} />
                                {preview ? 'Edit' : 'Preview'}
                            </button>
                            <button
                                onClick={saveDraft}
                                disabled={!title && !content}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save size={16} />
                                Save Draft
                            </button>
                            <button
                                onClick={downloadContent}
                                disabled={!content}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                                <Download size={16} />
                                Markdown
                            </button>
                            <button
                                onClick={downloadAsPDF}
                                disabled={!content}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-md hover:from-red-700 hover:to-pink-700 disabled:opacity-50 font-medium"
                            >
                                <FileText size={16} />
                                PDF
                            </button>
                            <button
                                onClick={downloadAsWord}
                                disabled={!content}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium"
                            >
                                <FileText size={16} />
                                Word
                            </button>
                        </div>
                    </div>

                    {/* 3-Step Generation Progress */}
                    {aiLoading && generationStep > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg shadow-lg border-2 border-blue-300">
                            <div className="flex items-center gap-3 mb-4">
                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                <div>
                                    <h3 className="text-lg font-bold text-blue-900">AI Content Generation in Progress</h3>
                                    <p className="text-sm text-blue-700">{generationProgress}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Step 1 */}
                                <div className={`flex items-center gap-3 p-3 rounded-lg ${generationStep >= 1 ? 'bg-white border-2 border-blue-300' : 'bg-gray-100'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${generationStep > 1 ? 'bg-green-500 text-white' : generationStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {generationStep > 1 ? '✓' : '1'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">Generate AI Content</p>
                                        <p className="text-xs text-gray-600">Creating comprehensive article with research and examples</p>
                                    </div>
                                    {generationStep === 1 && <Loader2 className="animate-spin text-blue-600" size={20} />}
                                </div>

                                {/* Step 2 */}
                                <div className={`flex items-center gap-3 p-3 rounded-lg ${generationStep >= 2 ? 'bg-white border-2 border-purple-300' : 'bg-gray-100'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${generationStep > 2 ? 'bg-green-500 text-white' : generationStep === 2 ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {generationStep > 2 ? '✓' : '2'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">Humanize Content</p>
                                        <p className="text-xs text-gray-600">Making it sound 100% human-written with natural language</p>
                                    </div>
                                    {generationStep === 2 && <Loader2 className="animate-spin text-purple-600" size={20} />}
                                </div>

                                {/* Step 3 */}
                                <div className={`flex items-center gap-3 p-3 rounded-lg ${generationStep >= 3 ? 'bg-white border-2 border-pink-300' : 'bg-gray-100'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${generationStep > 3 ? 'bg-green-500 text-white' : generationStep === 3 ? 'bg-pink-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                        {generationStep > 3 ? '✓' : '3'}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900">Generate & Insert Images</p>
                                        <p className="text-xs text-gray-600">Creating relevant images and placing them perfectly</p>
                                    </div>
                                    {generationStep === 3 && <Loader2 className="animate-spin text-pink-600" size={20} />}
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg">
                                <p className="text-xs text-center text-blue-900 font-medium">
                                    ✨ Creating 100% human-like content with perfect image placement
                                </p>
                            </div>
                        </div>
                    )}

                    {/* AI Generated Images */}
                    {(imageUrls.length > 0 || imageLoading) && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg shadow-sm border-2 border-purple-200">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                                    <ImageIcon size={20} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-purple-900">AI Generated Images</h3>
                                    <p className="text-xs text-purple-600">Perfectly matched to your content</p>
                                </div>
                                <button
                                    onClick={regenerateImages}
                                    disabled={imageLoading}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-sm"
                                >
                                    {imageLoading ? (
                                        <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                        <RefreshCw size={14} />
                                    )}
                                    Regenerate
                                </button>
                            </div>

                            {imageLoading ? (
                                <div className="flex items-center justify-center h-64 bg-white rounded-lg border-2 border-dashed border-purple-300">
                                    <div className="text-center">
                                        <Loader2 className="animate-spin mx-auto mb-3 text-purple-600" size={32} />
                                        <p className="text-purple-700 font-medium">Generating AI Images...</p>
                                        <p className="text-sm text-purple-600 mt-1">Analyzing your content</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        {imageUrls.map((url, i) => (
                                            <div key={i} className="relative group bg-white rounded-lg overflow-hidden shadow-md border-2 border-purple-100 hover:border-purple-300 transition-all">
                                                <img
                                                    src={url}
                                                    alt={imagePrompts[i] || `AI Generated ${i + 1}`}
                                                    className="w-full h-48 object-cover"
                                                    onError={(e) => {
                                                        e.target.src = `https://picsum.photos/800/600?random=${i + 100}`
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                                        <p className="text-white text-xs mb-2 line-clamp-2">
                                                            {imagePrompts[i] || 'AI Generated Image'}
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => insertImage(url, i)}
                                                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:from-purple-700 hover:to-pink-700"
                                                            >
                                                                Insert
                                                            </button>
                                                            <button
                                                                onClick={() => downloadImage(url, i)}
                                                                className="bg-white text-purple-600 px-3 py-1.5 rounded text-sm font-medium hover:bg-purple-50"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedImages.includes(url) && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                                        ✓ Inserted
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                                        <p className="text-xs text-purple-700 flex items-center gap-2">
                                            <Sparkles size={14} className="text-purple-600" />
                                            <span className="font-medium">AI-Powered:</span>
                                            Images are generated based on your content's key concepts and themes
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Generate Images Button */}
                    {imageUrls.length === 0 && !imageLoading && content && typeof content === 'string' && content.trim() && (
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <button
                                onClick={regenerateImages}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium"
                            >
                                <Sparkles size={18} />
                                Generate AI Images for Content
                            </button>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                AI will analyze your content and create relevant images
                            </p>
                        </div>
                    )}

                    {/* WordPress Settings Modal */}
                    {showWordPressModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-cyan-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Settings className="text-white" size={24} />
                                            <h2 className="text-2xl font-bold text-white">WordPress Settings</h2>
                                        </div>
                                        <button
                                            onClick={() => setShowWordPressModal(false)}
                                            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Add New Site Form */}
                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-lg border-2 border-blue-200">
                                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Add WordPress Site</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Site Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={wpSiteName}
                                                    onChange={(e) => setWpSiteName(e.target.value)}
                                                    placeholder="My Blog"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    WordPress URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={wpSiteUrl}
                                                    onChange={(e) => setWpSiteUrl(e.target.value)}
                                                    placeholder="https://yourblog.com"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    value={wpUsername}
                                                    onChange={(e) => setWpUsername(e.target.value)}
                                                    placeholder="admin"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Application Password
                                                </label>
                                                <input
                                                    type="password"
                                                    value={wpPassword}
                                                    onChange={(e) => setWpPassword(e.target.value)}
                                                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Generate in WordPress: Users → Profile → Application Passwords
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={testWordPressConnection}
                                                    disabled={wpTestLoading}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                    {wpTestLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                                    Test Connection
                                                </button>
                                                <button
                                                    onClick={addWordPressSite}
                                                    disabled={wordpressLoading}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    {wordpressLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                                    Add Site
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Connected Sites List */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Connected Sites</h3>
                                        {wordpressSites.length === 0 ? (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                <Settings className="mx-auto text-gray-400 mb-2" size={32} />
                                                <p className="text-gray-500">No WordPress sites connected</p>
                                                <p className="text-sm text-gray-400 mt-1">Add your first site above</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {wordpressSites.map((site) => (
                                                    <div key={site._id} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow">
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900">{site.name}</h4>
                                                            <p className="text-sm text-gray-500">{site.url}</p>
                                                            <p className="text-xs text-gray-400 mt-1">Username: {site.username}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => deleteWordPressSite(site._id)}
                                                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <XCircle size={20} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Publish to WordPress Modal */}
                    {showPublishModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                                <div className="p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ExternalLink className="text-white" size={24} />
                                            <h2 className="text-2xl font-bold text-white">Publish to WordPress</h2>
                                        </div>
                                        <button
                                            onClick={() => setShowPublishModal(false)}
                                            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select WordPress Site
                                        </label>
                                        <select
                                            value={selectedWordPressSite || ''}
                                            onChange={(e) => setSelectedWordPressSite(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        >
                                            {wordpressSites.map((site) => (
                                                <option key={site._id} value={site._id}>
                                                    {site.name} ({site.url})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <h4 className="font-semibold text-blue-900 mb-2">Content Preview</h4>
                                        <p className="text-sm text-blue-800"><strong>Title:</strong> {title}</p>
                                        <p className="text-sm text-blue-800 mt-1"><strong>Images:</strong> {imageUrls.length} images</p>
                                        <p className="text-sm text-blue-800 mt-1"><strong>Words:</strong> ~{content.split(' ').length}</p>
                                    </div>

                                    <button
                                        onClick={publishToWordPress}
                                        disabled={wordpressLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium"
                                    >
                                        {wordpressLoading ? <Loader2 className="animate-spin" size={20} /> : <ExternalLink size={20} />}
                                        {wordpressLoading ? 'Publishing...' : 'Publish Now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bulk Import Modal */}
                    {showBulkImportModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Upload className="text-white" size={24} />
                                            <h2 className="text-2xl font-bold text-white">Bulk Import from Excel</h2>
                                        </div>
                                        <button
                                            onClick={() => setShowBulkImportModal(false)}
                                            className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1"
                                        >
                                            <XCircle size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {!bulkImportJob ? (
                                        <>
                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-200">
                                                <h3 className="text-lg font-semibold text-purple-900 mb-3">📋 How It Works</h3>
                                                <ol className="text-sm text-purple-800 space-y-2 list-decimal list-inside">
                                                    <li>Upload Excel file with "Title" column</li>
                                                    <li>AI generates content for each title</li>
                                                    <li>Content is humanized automatically</li>
                                                    <li>Relevant images are added</li>
                                                    <li>Posts are published to WordPress</li>
                                                </ol>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Select WordPress Site
                                                </label>
                                                <select
                                                    value={selectedWordPressSite || ''}
                                                    onChange={(e) => setSelectedWordPressSite(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                >
                                                    {wordpressSites.map((site) => (
                                                        <option key={site._id} value={site._id}>
                                                            {site.name} ({site.url})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Upload Excel File
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".xlsx,.xls"
                                                    onChange={(e) => setBulkImportFile(e.target.files[0])}
                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Excel file must have a "Title" column with blog post titles
                                                </p>
                                            </div>

                                            {bulkImportFile && (
                                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <p className="text-sm text-green-800">
                                                        <strong>Selected:</strong> {bulkImportFile.name}
                                                    </p>
                                                </div>
                                            )}

                                            <button
                                                onClick={handleBulkImport}
                                                disabled={wordpressLoading || !bulkImportFile}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-medium"
                                            >
                                                {wordpressLoading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                                                {wordpressLoading ? 'Starting...' : 'Start Bulk Import'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {/* Progress Display */}
                                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-300">
                                                {/* Resume Indicator */}
                                                {localStorage.getItem('bulkImportJobId') && bulkImportJob.status === 'processing' && (
                                                    <div className="mb-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
                                                        <RefreshCw size={18} className="animate-spin" />
                                                        <span className="text-sm font-medium">
                                                            ✅ Job resumed after page refresh - Processing continues in background
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 mb-4">
                                                    {bulkImportJob.status === 'processing' && <Loader2 className="animate-spin text-blue-600" size={24} />}
                                                    {bulkImportJob.status === 'completed' && <CheckCircle className="text-green-600" size={24} />}
                                                    {bulkImportJob.status === 'failed' && <XCircle className="text-red-600" size={24} />}
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900">
                                                            {bulkImportJob.status === 'processing' && 'Processing...'}
                                                            {bulkImportJob.status === 'completed' && 'Completed!'}
                                                            {bulkImportJob.status === 'failed' && 'Failed'}
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            {bulkImportJob.processedPosts} / {bulkImportJob.totalPosts} posts processed
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500"
                                                        style={{ width: `${(bulkImportJob.processedPosts / bulkImportJob.totalPosts) * 100}%` }}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div className="bg-white p-3 rounded-lg">
                                                        <p className="text-gray-600">Successful</p>
                                                        <p className="text-2xl font-bold text-green-600">{bulkImportJob.successfulPosts}</p>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg">
                                                        <p className="text-gray-600">Failed</p>
                                                        <p className="text-2xl font-bold text-red-600">{bulkImportJob.failedPosts}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Results Table with Live Links */}
                                            {bulkImportJob.posts && bulkImportJob.posts.length > 0 && (
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        <FileText size={20} />
                                                        Published Posts with Live Links
                                                    </h3>
                                                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-50 sticky top-0">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left">#</th>
                                                                    <th className="px-4 py-2 text-left">Title</th>
                                                                    <th className="px-4 py-2 text-left">Status</th>
                                                                    <th className="px-4 py-2 text-left">Images</th>
                                                                    <th className="px-4 py-2 text-left">Live Blog Link</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {bulkImportJob.posts.map((post, index) => (
                                                                    <tr key={index} className="border-t hover:bg-gray-50">
                                                                        <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                                                                        <td className="px-4 py-2 font-medium">{post.title}</td>
                                                                        <td className="px-4 py-2">
                                                                            {post.status === 'published' ? (
                                                                                <span className="text-green-600 flex items-center gap-1 font-semibold">
                                                                                    <CheckCircle size={14} /> Published
                                                                                </span>
                                                                            ) : post.status === 'failed' ? (
                                                                                <span className="text-red-600 flex items-center gap-1">
                                                                                    <XCircle size={14} /> Failed
                                                                                </span>
                                                                            ) : post.status === 'generating' ? (
                                                                                <span className="text-blue-600 flex items-center gap-1">
                                                                                    <Loader2 size={14} className="animate-spin" /> Generating
                                                                                </span>
                                                                            ) : post.status === 'publishing' ? (
                                                                                <span className="text-purple-600 flex items-center gap-1">
                                                                                    <Loader2 size={14} className="animate-spin" /> Publishing
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-600 flex items-center gap-1">
                                                                                    <Clock size={14} /> Pending
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-gray-600">
                                                                            {post.uploadedImages || 0} / {post.imageCount || 0}
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {post.wordpressPostUrl ? (
                                                                                <a
                                                                                    href={post.wordpressPostUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                                                                >
                                                                                    <ExternalLink size={14} /> View Post
                                                                                </a>
                                                                            ) : (
                                                                                <span className="text-gray-400">-</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {bulkImportJob.status !== 'processing' && (
                                                <div className="space-y-3">
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                showToast('📥 Downloading Excel report...', 'info')
                                                                await api.downloadBulkImportExcel(bulkImportJob._id)
                                                                showToast('✅ Excel report downloaded with live blog links!', 'success')
                                                            } catch (error) {
                                                                showToast('Failed to download Excel', 'error')
                                                            }
                                                        }}
                                                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-semibold flex items-center justify-center gap-2"
                                                    >
                                                        <Download size={20} />
                                                        Download Excel Report with Live Links
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setBulkImportJob(null)
                                                            setBulkImportFile(null)
                                                        }}
                                                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                                    >
                                                        Start New Import
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h2 className="text-xl font-semibold mb-4">Saved Drafts</h2>
                        <div className="space-y-3">
                            {saved.length === 0 ? (
                                <p className="text-gray-500 text-sm">No saved drafts</p>
                            ) : (
                                saved.map(draft => (
                                    <div
                                        key={draft.id}
                                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                        onClick={() => {
                                            setTitle(draft.title)
                                            setContent(draft.content)
                                            showToast('Draft loaded', 'success')
                                        }}
                                    >
                                        <p className="font-medium">{draft.title}</p>
                                        <p className="text-xs text-gray-500">{draft.date}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-300">
                        <h3 className="font-semibold text-purple-900 mb-3">🚀 3-Step AI Generation</h3>
                        <ul className="text-sm text-purple-800 space-y-2">
                            <li>• <span className="font-bold">Step 1:</span> AI generates content</li>
                            <li>• <span className="font-bold">Step 2:</span> Humanizes the text</li>
                            <li>• <span className="font-bold">Step 3:</span> Auto-inserts images</li>
                            <li>• <span className="font-semibold text-pink-600">100% human-like writing</span></li>
                            <li>• Natural grammar variations</li>
                            <li>• Perfect image placement</li>
                            <li>• Ready in 3 steps!</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border-2 border-green-300">
                        <h3 className="font-semibold text-green-900 mb-3">✨ AI Features</h3>
                        <ul className="text-sm text-green-800 space-y-2">
                            <li>• 1000+ word articles</li>
                            <li>• Research & examples</li>
                            <li>• Statistics & data</li>
                            <li>• <span className="font-semibold text-purple-600">Human-like writing</span></li>
                            <li>• Auto image insertion</li>
                            <li>• <span className="font-semibold text-blue-600">Export to Word</span></li>
                            <li>• <span className="font-semibold text-red-600">Export to PDF</span></li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-300">
                        <h3 className="font-semibold text-blue-900 mb-3">📄 Word Export</h3>
                        <ul className="text-sm text-blue-800 space-y-2">
                            <li>• Professional .docx format</li>
                            <li>• All images embedded</li>
                            <li>• Perfect formatting</li>
                            <li>• Editable document</li>
                            <li>• Ready to share</li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg border-2 border-orange-300">
                        <h3 className="font-semibold text-orange-900 mb-3">💡 Pro Tips</h3>
                        <ul className="text-sm text-orange-800 space-y-2">
                            <li>• Be specific with topics</li>
                            <li>• Let AI complete all 3 steps</li>
                            <li>• Images auto-placed perfectly</li>
                            <li>• Export to Word for editing</li>
                            <li>• Save drafts regularly</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* Copyright © 2025 Harsh J Kuhikar - All Rights Reserved */
